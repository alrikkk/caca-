import {
  ExtractedProjectRequirements,
  SkillNormalizationResult,
  TeamGapExplanation,
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
}
