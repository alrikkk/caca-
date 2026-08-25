import {
  ExtractedProjectRequirements,
  GroundedMatchExplanation,
  SearchIntentResult,
  SkillNormalizationResult,
  SquadRecommendationResult,
  TeamGapExplanation,
  TeamSynergyExplanation,
} from '@/types/ai';
import { Project } from '@/types/project';
import { StudentProfile } from '@/types/user';
import { TeamCompositionResult } from '@/types/matching';
import { AIProvider } from './provider';
import { MockAIProvider } from './mock-provider';
import { AISanitizer } from './sanitizer';

/**
 * ServerAIProvider handles dynamic LLM interaction with timeout and structured JSON output.
 * Automatically delegates to MockAIProvider on missing credentials, network failure, or timeout.
 */
export class ServerAIProvider implements AIProvider {
  private fallback: MockAIProvider;
  private apiKey?: string;
  private providerType: 'gemini' | 'openai' | 'anthropic' | 'mock';

  constructor() {
    this.fallback = new MockAIProvider();
    const envProvider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

    if (process.env.GEMINI_API_KEY) {
      this.apiKey = process.env.GEMINI_API_KEY;
      this.providerType = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      this.apiKey = process.env.OPENAI_API_KEY;
      this.providerType = 'openai';
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.apiKey = process.env.ANTHROPIC_API_KEY;
      this.providerType = 'anthropic';
    } else {
      this.providerType = (envProvider as any) || 'mock';
    }
  }

  private isLiveAIConfigured(): boolean {
    return Boolean(this.apiKey && this.providerType !== 'mock');
  }

  /**
   * Helper to call LLM with timeout and sanitized JSON prompt.
   */
  private async queryLLM<T>(
    systemPrompt: string,
    userPrompt: string,
    timeoutMs = 6000
  ): Promise<T | null> {
    if (!this.isLiveAIConfigured()) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (this.providerType === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nStrict JSON Output Requirement: Output valid JSON only, without markdown fences or extraneous text.\n\n${userPrompt}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (!res.ok) {
          console.warn(`[ServerAIProvider] Gemini HTTP error ${res.status}: ${res.statusText}`);
          return null;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return null;
        const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(cleaned) as T;
      }

      if (this.providerType === 'openai') {
        const url = 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: `${systemPrompt} Output valid JSON only.` },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (!res.ok) {
          console.warn(`[ServerAIProvider] OpenAI HTTP error ${res.status}: ${res.statusText}`);
          return null;
        }

        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content;
        if (!rawText) return null;
        return JSON.parse(rawText) as T;
      }

      return null;
    } catch (err) {
      console.warn('[ServerAIProvider] LLM call failed or timed out, falling back to deterministic engine:', err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async recommendSquad(
    project: Project,
    candidates: StudentProfile[],
    currentMembers: StudentProfile[] = []
  ): Promise<SquadRecommendationResult> {
    const sanitizedProject = AISanitizer.sanitizeProject(project);
    const sanitizedPool = AISanitizer.sanitizeCandidatePool(candidates);

    if (this.isLiveAIConfigured()) {
      const prompt = `Project: ${JSON.stringify(sanitizedProject)}\n\nCandidates: ${JSON.stringify(sanitizedPool)}\n\nRecommend the optimal squad for this project. Format: JSON matching SquadRecommendationResult schema.`;
      const systemPrompt = `You are Caca's AI Squad Builder. Given a student project and candidate pool, recommend the best team members based strictly on verified skill overlap, availability, and working styles. Do not invent skills or candidates.`;

      const aiResult = await this.queryLLM<SquadRecommendationResult>(systemPrompt, prompt);
      if (aiResult && aiResult.recommendedSquad && aiResult.recommendedSquad.length > 0) {
        // Validate candidate IDs match candidate pool
        const validIds = new Set(candidates.map((c) => c.id));
        const validSquad = aiResult.recommendedSquad.filter((m) => validIds.has(m.candidateId));
        if (validSquad.length > 0) {
          return {
            ...aiResult,
            recommendedSquad: validSquad,
          };
        }
      }
    }

    return this.fallback.recommendSquad(project, candidates, currentMembers);
  }

  async explainIndividualMatch(
    project: Project,
    student: StudentProfile
  ): Promise<GroundedMatchExplanation> {
    const sanitizedProject = AISanitizer.sanitizeProject(project);
    const sanitizedStudent = AISanitizer.sanitizeCandidate(student);

    if (this.isLiveAIConfigured()) {
      const prompt = `Project: ${JSON.stringify(sanitizedProject)}\n\nCandidate: ${JSON.stringify(sanitizedStudent)}\n\nExplain why this candidate matches this project and what gaps exist.`;
      const systemPrompt = `You are Caca's Match Explainer. Provide grounded explanation points (whyYouMatch, missingCapabilities, roleSuitability) strictly based on provided candidate skills and project requirements. Do not invent skills.`;

      const aiResult = await this.queryLLM<GroundedMatchExplanation>(systemPrompt, prompt);
      if (aiResult && aiResult.whyYouMatch && aiResult.whyYouMatch.length > 0) {
        return aiResult;
      }
    }

    return this.fallback.explainIndividualMatch(project, student);
  }

  async explainTeamSynergy(
    project: Project,
    teamMembers: StudentProfile[]
  ): Promise<TeamSynergyExplanation> {
    const sanitizedProject = AISanitizer.sanitizeProject(project);
    const sanitizedMembers = AISanitizer.sanitizeCandidatePool(teamMembers);

    if (this.isLiveAIConfigured()) {
      const prompt = `Project: ${JSON.stringify(sanitizedProject)}\n\nTeam: ${JSON.stringify(sanitizedMembers)}\n\nEvaluate team synergy and capabilities.`;
      const systemPrompt = `You are Caca's Team Synergy Evaluator. Analyze team skill coverage, schedule overlap, and working styles.`;

      const aiResult = await this.queryLLM<TeamSynergyExplanation>(systemPrompt, prompt);
      if (aiResult && aiResult.breakdown) {
        return aiResult;
      }
    }

    return this.fallback.explainTeamSynergy(project, teamMembers);
  }

  async parseSearchIntent(rawQuery: string): Promise<SearchIntentResult> {
    if (this.isLiveAIConfigured()) {
      const prompt = `Query: "${rawQuery}"\n\nExtract search filters.`;
      const systemPrompt = `You are Caca's Search Intent Parser. Parse natural language queries (e.g. "React designer available evenings") into structured filter JSON containing extractedSkills, extractedRoles, extractedCategories, experiencePreference, availabilityPreference.`;

      const aiResult = await this.queryLLM<SearchIntentResult>(systemPrompt, prompt);
      if (aiResult && (aiResult.extractedSkills || aiResult.extractedRoles)) {
        return {
          ...aiResult,
          rawQuery,
          keywords: aiResult.keywords || rawQuery.split(' '),
        };
      }
    }

    return this.fallback.parseSearchIntent(rawQuery);
  }

  async extractProjectRequirements(rawDescription: string): Promise<ExtractedProjectRequirements> {
    return this.fallback.extractProjectRequirements(rawDescription);
  }

  async normalizeSkill(rawSkillName: string): Promise<SkillNormalizationResult> {
    return this.fallback.normalizeSkill(rawSkillName);
  }

  async explainTeamGaps(project: Project, composition: TeamCompositionResult): Promise<TeamGapExplanation> {
    return this.fallback.explainTeamGaps(project, composition);
  }
}

/**
 * Singleton server AI provider instance
 */
export const serverAIProvider = new ServerAIProvider();
