import {
  ExtractedProjectRequirements,
  GroundedMatchExplanation,
  SanitizedCandidate,
  SearchIntentResult,
  SkillNormalizationResult,
  SquadRecommendationResult,
  TeamGapExplanation,
  TeamSynergyExplanation,
} from '@/types/ai';
import { Project } from '@/types/project';
import { StudentProfile } from '@/types/user';
import { TeamCompositionResult } from '@/types/matching';

export interface AIProvider {
  extractProjectRequirements(
    rawDescription: string
  ): Promise<ExtractedProjectRequirements>;

  normalizeSkill(rawSkillName: string): Promise<SkillNormalizationResult>;

  explainTeamGaps(
    project: Project,
    composition: TeamCompositionResult
  ): Promise<TeamGapExplanation>;

  recommendSquad(
    project: Project,
    candidates: StudentProfile[],
    currentMembers?: StudentProfile[]
  ): Promise<SquadRecommendationResult>;

  explainIndividualMatch(
    project: Project,
    student: StudentProfile
  ): Promise<GroundedMatchExplanation>;

  explainTeamSynergy(
    project: Project,
    teamMembers: StudentProfile[]
  ): Promise<TeamSynergyExplanation>;

  parseSearchIntent(rawQuery: string): Promise<SearchIntentResult>;
}
