import { SearchIntentResult } from "@/types/ai";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";

interface SkillMapping {
  canonical: string;
  patterns: RegExp[];
}

interface RoleMapping {
  canonical: string;
  patterns: RegExp[];
}

interface DomainMapping {
  canonical: string;
  patterns: RegExp[];
}

const SKILL_MAPPINGS: SkillMapping[] = [
  { canonical: "Python", patterns: [/\bpython\b/i] },
  { canonical: "React", patterns: [/\breact(\.js|js)?\b/i] },
  { canonical: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
  { canonical: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
  { canonical: "Next.js", patterns: [/\bnext(\.js|js)?\b/i] },
  { canonical: "PyTorch", patterns: [/\bpytorch\b/i, /\btorch\b/i] },
  { canonical: "TensorFlow", patterns: [/\btensorflow\b/i, /\btf\b/i] },
  { canonical: "Figma", patterns: [/\bfigma\b/i] },
  { canonical: "Rust", patterns: [/\brust\b/i] },
  { canonical: "C++", patterns: [/\bc\+\+\b/i, /\bcpp\b/i] },
  { canonical: "Docker", patterns: [/\bdocker\b/i, /\bkubernetes\b/i, /\bk8s\b/i] },
  { canonical: "PostgreSQL", patterns: [/\bpostgres(ql)?\b/i, /\bsql\b/i] },
  { canonical: "Tailwind CSS", patterns: [/\btailwind(css)?\b/i] },
  { canonical: "Machine Learning", patterns: [/\bmachine\s+learning\b/i, /\bml\b/i] },
  { canonical: "Deep Learning", patterns: [/\bdeep\s+learning\b/i] },
  { canonical: "AI", patterns: [/\bai\b/i, /\bartificial\s+intelligence\b/i] },
  { canonical: "Frontend", patterns: [/\bfront-?end\b/i] },
  { canonical: "Backend", patterns: [/\bback-?end\b/i] },
  { canonical: "Full Stack", patterns: [/\bfull-?stack\b/i] },
  { canonical: "UI/UX", patterns: [/\bui\/ux\b/i, /\bui\b/i, /\bux\b/i, /\bhci\b/i] },
  { canonical: "Node.js", patterns: [/\bnode(\.js|js)?\b/i] },
  { canonical: "CUDA", patterns: [/\bcuda\b/i] },
  { canonical: "GraphQL", patterns: [/\bgraphql\b/i] },
  { canonical: "Hugging Face", patterns: [/\bhugging\s*face\b/i, /\btransformers\b/i] },
  { canonical: "Linux / eBPF", patterns: [/\blinux\b/i, /\bebpf\b/i, /\bkernel\b/i] },
];

const ROLE_MAPPINGS: RoleMapping[] = [
  { canonical: "Developer", patterns: [/\b(developer|dev|coder|programmer|architect)\b/i] },
  { canonical: "Designer", patterns: [/\b(designer)\b/i] },
  { canonical: "Engineer", patterns: [/\b(engineer)\b/i] },
  { canonical: "Researcher", patterns: [/\b(researcher|scientist)\b/i] },
  { canonical: "Student", patterns: [/\b(student|students|undergrad|undergrads)\b/i] },
  { canonical: "Lead", patterns: [/\b(lead|founder|pm|product\s+manager)\b/i] },
];

const DOMAIN_MAPPINGS: DomainMapping[] = [
  { canonical: "Healthcare", patterns: [/\b(healthcare|health|medical|clinical|bio-?informatics)\b/i] },
  { canonical: "Accessibility", patterns: [/\b(accessibility|assistive|a11y|inclusive\s+design)\b/i] },
  { canonical: "Robotics", patterns: [/\b(robotics|robots|embedded|autonomous)\b/i] },
  { canonical: "Fintech", patterns: [/\b(fintech|finance|defi|crypto|blockchain|smart\s+contracts)\b/i] },
  { canonical: "EdTech", patterns: [/\b(edtech|education|learning|pedagogy)\b/i] },
  { canonical: "Biotech", patterns: [/\b(biotech|genomics|biology)\b/i] },
  { canonical: "Climate", patterns: [/\b(climate|clean\s*tech|sustainability|environment)\b/i] },
  { canonical: "Cybersecurity", patterns: [/\b(security|cybersecurity|infosec|cryptography)\b/i] },
  { canonical: "Gaming", patterns: [/\b(gaming|game\s*dev)\b/i] },
  { canonical: "Computer Vision", patterns: [/\b(computer\s*vision|vision\s*models)\b/i] },
  { canonical: "Systems", patterns: [/\b(systems|infrastructure|distributed\s*systems)\b/i] },
];

export class IntentParser {
  /**
   * Parse a natural language search query deterministically into structured intent signals.
   */
  static parse(rawQuery: string): SearchIntentResult {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      return {
        rawQuery,
        extractedSkills: [],
        extractedRoles: [],
        extractedCategories: [],
        keywords: [],
      };
    }

    const lower = trimmed.toLowerCase();

    // 1. Extract Project Context / Category (e.g. Hackathon, Startup, Research)
    let projectCategory: string | undefined = undefined;
    if (/\b(hackathon|hackathons)\b/i.test(lower)) {
      projectCategory = "Hackathon";
    } else if (/\b(startup|startups)\b/i.test(lower)) {
      projectCategory = "Startup";
    } else if (/\b(research\s+project|for\s+research)\b/i.test(lower)) {
      projectCategory = "Research";
    } else if (/\b(open\s+source|side\s+project)\b/i.test(lower)) {
      projectCategory = "Open Source";
    }

    // 2. Extract Interests / Domains (Contextual: e.g. "interested in healthcare", "likes accessibility")
    const extractedCategories: string[] = [];

    // Helper to check domain mappings
    for (const domain of DOMAIN_MAPPINGS) {
      if (domain.patterns.some((p) => p.test(lower))) {
        if (!extractedCategories.includes(domain.canonical)) {
          extractedCategories.push(domain.canonical);
        }
      }
    }

    // 3. Extract Skills / Technologies (Word-boundary precision to avoid false positives like "ai" in "accessibility")
    const extractedSkills: string[] = [];
    for (const skill of SKILL_MAPPINGS) {
      // Special exclusion: If "ai" matches but only as part of "accessibility", don't extract "AI"
      if (skill.canonical === "AI" && extractedCategories.includes("Accessibility") && !/\bartificial\s+intelligence\b|\bai\b/i.test(lower.replace(/accessibility/gi, ""))) {
        continue;
      }
      // Special exclusion: Don't extract "UI/UX" from "accessibility" or "inclusive"
      if (skill.canonical === "UI/UX" && !/\bui\/ux\b|\bui\b|\bux\b|\bhci\b/i.test(lower.replace(/accessibility|inclusive/gi, ""))) {
        continue;
      }

      if (skill.patterns.some((p) => p.test(lower))) {
        if (!extractedSkills.includes(skill.canonical)) {
          extractedSkills.push(skill.canonical);
        }
      }
    }

    // 4. Extract Roles (e.g. Developer, Designer, Student, Engineer)
    const extractedRoles: string[] = [];
    for (const role of ROLE_MAPPINGS) {
      if (role.patterns.some((p) => p.test(lower))) {
        if (!extractedRoles.includes(role.canonical)) {
          extractedRoles.push(role.canonical);
        }
      }
    }

    // 5. Extract Availability
    let prefersEvenings = false;
    let prefersWeekends = false;
    let minHours: number | undefined = undefined;
    let availabilityLabel: string | undefined = undefined;

    if (/\b(weekend|weekends)\b/i.test(lower)) {
      prefersWeekends = true;
      availabilityLabel = "Weekends";
    }
    if (/\b(evening|evenings|night|nights)\b/i.test(lower)) {
      prefersEvenings = true;
      availabilityLabel = prefersWeekends ? "Weekends & Evenings" : "Evenings";
    }
    if (/\b(morning|mornings)\b/i.test(lower)) {
      availabilityLabel = "Mornings";
    }

    const hoursMatch = lower.match(/\b(\d+)\s*(h|hrs|hours|hours\/week|h\/wk)\b/i);
    if (hoursMatch) {
      minHours = parseInt(hoursMatch[1], 10);
      availabilityLabel = `${minHours}h/wk`;
    }

    const availabilityPreference =
      prefersEvenings || prefersWeekends || minHours !== undefined
        ? {
            minHours,
            prefersEvenings,
            prefersWeekends,
            label: availabilityLabel,
          }
        : undefined;

    // 6. Extract Experience Preference (ONLY if explicitly indicated)
    let experiencePreference: string | undefined = undefined;
    if (/\b(junior|beginner|freshman|entry-level|novice)\b/i.test(lower)) {
      experiencePreference = "junior";
    } else if (/\b(senior|experienced|advanced|expert)\b/i.test(lower)) {
      experiencePreference = "senior";
    } else if (/\b(mid-level|intermediate)\b/i.test(lower)) {
      experiencePreference = "mid";
    }

    // 7. Clean general keywords for fallback search
    const stopWords = new Set([
      "a", "an", "the", "in", "for", "with", "who", "and", "or", "to", "of",
      "on", "at", "by", "from", "is", "are", "likes", "like", "interested",
      "available", "know", "knows", "looking", "people", "person", "someone",
      "want", "wants", "can", "work", "i'm", "im", "we", "need"
    ]);

    const keywords = trimmed
      .split(/[\s,.;:!?]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 1 && !stopWords.has(w));

    return {
      rawQuery,
      extractedSkills,
      extractedRoles,
      extractedCategories,
      projectCategory,
      experiencePreference,
      availabilityPreference,
      keywords,
    };
  }

  /**
   * Rank candidates according to structured search intent signals with explainable scoring.
   */
  static rankCandidates(
    candidates: StudentProfile[],
    intent: SearchIntentResult
  ): Array<{ candidate: StudentProfile; relevanceScore: number; matchSignals: string[] }> {
    const hasSkills = intent.extractedSkills.length > 0;
    const hasRoles = intent.extractedRoles.length > 0;
    const hasCategories = intent.extractedCategories.length > 0;
    const hasAvailability = Boolean(
      intent.availabilityPreference &&
        (intent.availabilityPreference.prefersWeekends ||
          intent.availabilityPreference.prefersEvenings ||
          intent.availabilityPreference.minHours)
    );
    const hasExperience = Boolean(intent.experiencePreference);

    const hasAnyStructuredIntent =
      hasSkills || hasRoles || hasCategories || hasAvailability || hasExperience;

    const scored = candidates.map((student) => {
      let skillScore = 0;
      let roleScore = 0;
      let categoryScore = 0;
      let availabilityScore = 0;
      let experienceScore = 0;
      let keywordScore = 0;
      const matchSignals: string[] = [];

      // 1. Skill Matching
      if (hasSkills) {
        let matchedCount = 0;
        const candidateSkillNames = (student.skills || []).map((s) => s.name.toLowerCase());

        intent.extractedSkills.forEach((reqSkill) => {
          const reqLower = reqSkill.toLowerCase();
          const found = candidateSkillNames.some(
            (cs) => cs.includes(reqLower) || reqLower.includes(cs)
          );
          if (found) {
            matchedCount++;
            matchSignals.push(`Skill: ${reqSkill}`);
          }
        });

        skillScore = (matchedCount / intent.extractedSkills.length) * 100;
      }

      // 2. Role Matching
      if (hasRoles) {
        const textToSearch = `${student.headline || ""} ${student.major || ""} ${student.bio || ""}`.toLowerCase();
        let matchedRoles = 0;

        intent.extractedRoles.forEach((reqRole) => {
          const roleLower = reqRole.toLowerCase();
          if (textToSearch.includes(roleLower) || (reqRole === "Developer" && textToSearch.includes("engineer"))) {
            matchedRoles++;
            matchSignals.push(`Role: ${reqRole}`);
          }
        });

        roleScore = (matchedRoles / intent.extractedRoles.length) * 100;
      }

      // 3. Category / Interest Matching
      if (hasCategories) {
        const candidateInterests = (student.interests || [])
          .map((i) => `${i.name} ${i.category}`)
          .join(" ")
          .toLowerCase();
        const candidateBio = (student.bio || "").toLowerCase();
        const candidateMajor = (student.major || "").toLowerCase();
        const candidateOpenTo = (student.openTo || []).join(" ").toLowerCase();

        const combinedContext = `${candidateInterests} ${candidateBio} ${candidateMajor} ${candidateOpenTo}`;

        let matchedCats = 0;
        intent.extractedCategories.forEach((cat) => {
          const catLower = cat.toLowerCase();
          if (combinedContext.includes(catLower)) {
            matchedCats++;
            matchSignals.push(`Domain: ${cat}`);
          }
        });

        categoryScore = (matchedCats / intent.extractedCategories.length) * 100;
      }

      // 4. Availability Matching
      if (hasAvailability && intent.availabilityPreference) {
        let availPoints = 0;
        let totalAvailChecks = 0;

        if (intent.availabilityPreference.prefersWeekends) {
          totalAvailChecks++;
          if (student.availability?.weekendAvailability) {
            availPoints++;
            matchSignals.push("Avail: Weekends");
          }
        }
        if (intent.availabilityPreference.prefersEvenings) {
          totalAvailChecks++;
          if (student.availability?.weekdayEvenings) {
            availPoints++;
            matchSignals.push("Avail: Evenings");
          }
        }
        if (intent.availabilityPreference.minHours) {
          totalAvailChecks++;
          if ((student.availability?.hoursPerWeek || 0) >= intent.availabilityPreference.minHours) {
            availPoints++;
          }
        }

        availabilityScore = totalAvailChecks > 0 ? (availPoints / totalAvailChecks) * 100 : 100;
      }

      // 5. Experience Matching
      if (hasExperience && intent.experiencePreference) {
        if (student.experienceLevel === intent.experiencePreference) {
          experienceScore = 100;
          matchSignals.push(`Level: ${student.experienceLevel}`);
        }
      }

      // 6. Fallback Keyword Matching
      if (intent.keywords.length > 0) {
        const fullCandidateText = `${student.fullName} ${student.headline || ""} ${student.major || ""} ${student.college} ${student.bio || ""} ${(student.skills || []).map((s) => s.name).join(" ")}`.toLowerCase();
        let kwMatches = 0;
        intent.keywords.forEach((kw) => {
          if (fullCandidateText.includes(kw)) kwMatches++;
        });
        keywordScore = (kwMatches / intent.keywords.length) * 100;
      }

      // Calculate composite score
      let totalWeight = 0;
      let weightedSum = 0;

      if (hasSkills) {
        const weight = 45;
        weightedSum += skillScore * weight;
        totalWeight += weight;
      }
      if (hasRoles) {
        const weight = 25;
        weightedSum += roleScore * weight;
        totalWeight += weight;
      }
      if (hasCategories) {
        const weight = 20;
        weightedSum += categoryScore * weight;
        totalWeight += weight;
      }
      if (hasAvailability) {
        const weight = 10;
        weightedSum += availabilityScore * weight;
        totalWeight += weight;
      }
      if (hasExperience) {
        const weight = 10;
        weightedSum += experienceScore * weight;
        totalWeight += weight;
      }

      let finalScore = 0;
      if (totalWeight > 0) {
        finalScore = Math.round(weightedSum / totalWeight);
        // Small keyword boost if keywords matched
        if (keywordScore > 0) {
          finalScore = Math.min(100, finalScore + Math.round(keywordScore * 0.05));
        }
      } else {
        // Only general keywords provided
        finalScore = Math.round(keywordScore);
      }

      return {
        candidate: student,
        relevanceScore: finalScore,
        matchSignals,
      };
    });

    // If structured intent was present, return candidates sorted by relevance
    // Candidates with at least partial match rank higher than candidates with 0 match
    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Rank projects according to structured search intent signals.
   */
  static rankProjects(
    projects: Project[],
    intent: SearchIntentResult
  ): Array<{ project: Project; relevanceScore: number; matchSignals: string[] }> {
    const hasSkills = intent.extractedSkills.length > 0;
    const hasCategories = intent.extractedCategories.length > 0 || Boolean(intent.projectCategory);

    return projects
      .map((proj) => {
        let score = 0;
        const matchSignals: string[] = [];

        // Check required skills
        if (hasSkills) {
          const reqSkillNames = proj.requiredSkills.map((s) => s.skill.name.toLowerCase());
          let matches = 0;
          intent.extractedSkills.forEach((sk) => {
            if (reqSkillNames.some((r) => r.includes(sk.toLowerCase()))) {
              matches++;
              matchSignals.push(`Skill: ${sk}`);
            }
          });
          score += (matches / intent.extractedSkills.length) * 50;
        }

        // Check categories & project context
        if (hasCategories) {
          const catText = `${proj.category} ${proj.title} ${proj.tagline}`.toLowerCase();
          let catMatches = 0;
          const allTargetCats = [...intent.extractedCategories];
          if (intent.projectCategory) allTargetCats.push(intent.projectCategory);

          allTargetCats.forEach((c) => {
            if (catText.includes(c.toLowerCase())) {
              catMatches++;
              matchSignals.push(`Category: ${c}`);
            }
          });
          score += (catMatches / allTargetCats.length) * 40;
        }

        // Check general keywords
        if (intent.keywords.length > 0) {
          const projText = `${proj.title} ${proj.tagline} ${proj.description} ${proj.category}`.toLowerCase();
          let kwMatches = 0;
          intent.keywords.forEach((kw) => {
            if (projText.includes(kw)) kwMatches++;
          });
          score += (kwMatches / intent.keywords.length) * 20;
        }

        return {
          project: proj,
          relevanceScore: Math.min(100, Math.round(score)),
          matchSignals,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
