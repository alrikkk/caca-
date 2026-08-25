import { SkillImportance } from './project';
import { SkillCategory } from './user';

export interface ExtractedSkillRequirement {
  name: string;
  category: SkillCategory | string;
  requiredProficiency: number; // 1-5
  importance: SkillImportance;
  rationale: string;
}

export interface ExtractedProjectRequirements {
  suggestedTitle: string;
  tagline: string;
  category: string;
  estimatedDurationWeeks: number;
  recommendedTeamSize: number;
  recommendedHoursPerWeek: number;
  skills: ExtractedSkillRequirement[];
  rolesNeeded: string[];
}

export interface SkillNormalizationResult {
  rawInput: string;
  canonicalName: string;
  category: SkillCategory | string;
  aliases: string[];
}

export interface TeamGapExplanation {
  summary: string;
  missingCapabilities: string[];
  recommendedNextHire: string;
  synergyHighlights: string[];
}
