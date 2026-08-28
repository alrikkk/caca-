import { SkillImportance } from './project';
import { SkillCategory, ExperienceLevel, WorkingStyle } from './user';

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

export interface SanitizedCandidate {
  id: string;
  aliasId: string;
  fullName: string;
  headline?: string;
  college: string;
  major: string;
  gradYear: number;
  experienceLevel: ExperienceLevel;
  workingStyle: WorkingStyle;
  skills: Array<{
    name: string;
    category: string;
    proficiency: number;
    yearsExperience?: number;
  }>;
  interests: Array<{
    name: string;
    category: string;
  }>;
  availability: {
    hoursPerWeek: number;
    timezone?: string;
    prefersRemote?: boolean;
    weekendAvailability?: boolean;
    weekdayEvenings?: boolean;
  };
}

export interface RecommendedSquadMember {
  candidateId: string;
  candidateName: string;
  college: string;
  major: string;
  assignedRole: string;
  fitScore: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  rationale: string;
  availabilityMatch: string;
  workingStyleFit: string;
}

export interface SquadRecommendationResult {
  projectId: string;
  projectName: string;
  projectCategory: string;
  recommendedSquad: RecommendedSquadMember[];
  predictedSynergyScore: number; // 0-100
  synergySummary: string;
  keyStrengths: string[];
  potentialRisks: string[];
}

export interface GroundedMatchExplanation {
  overallFitScore: number;
  summary: string;
  whyYouMatch: Array<{
    label: string;
    detail: string;
    type: 'skill' | 'availability' | 'interest' | 'experience' | 'style';
  }>;
  missingCapabilities: Array<{
    label: string;
    detail: string;
  }>;
  roleSuitability: string;
  growthOpportunities: string[];
}

export interface TeamSynergyExplanation {
  synergyScore: number; // 0-100
  breakdown: {
    skillCoverage: number; // 0-100
    roleDiversity: number; // 0-100
    availabilityOverlap: number; // 0-100
    workingStyleHarmony: number; // 0-100
    experienceBalance: number; // 0-100
  };
  summary: string;
  coveredCapabilities: string[];
  uncoveredGaps: string[];
  strengths: string[];
  recommendations: string[];
}

export interface SearchIntentResult {
  rawQuery: string;
  extractedSkills: string[];
  extractedRoles: string[];
  extractedCategories: string[]; // Domains / Interests (e.g. Healthcare, Robotics, Accessibility)
  projectCategory?: string; // Project Context (e.g. Hackathon, Startup, Research)
  experiencePreference?: string;
  availabilityPreference?: {
    minHours?: number;
    prefersEvenings?: boolean;
    prefersWeekends?: boolean;
    label?: string;
  };
  keywords: string[];
}
