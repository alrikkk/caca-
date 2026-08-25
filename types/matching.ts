import { StudentProfile } from './user';
import { Project, ProjectSkillRequirement } from './project';

export interface MatchingWeights {
  skillMatch: number;      // default: 0.35
  experience: number;      // default: 0.20
  availability: number;    // default: 0.15
  interestAlignment: number; // default: 0.15
  roleCompatibility: number; // default: 0.10
  workingStyle: number;    // default: 0.05
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  skillMatch: 0.35,
  experience: 0.20,
  availability: 0.15,
  interestAlignment: 0.15,
  roleCompatibility: 0.10,
  workingStyle: 0.05,
};

export interface StructuredMatchWhy {
  type: 'skill' | 'availability' | 'interest' | 'experience' | 'style';
  title: string;
  detail: string;
  isPositive: boolean;
}

export interface IndividualMatchResult {
  userId: string;
  projectId: string;
  overallScore: number; // 0 to 100
  breakdown: {
    skillScore: number;       // 0 to 100
    experienceScore: number;  // 0 to 100
    availabilityScore: number;// 0 to 100
    interestScore: number;    // 0 to 100
    roleScore: number;        // 0 to 100
    workingStyleScore: number;// 0 to 100
  };
  matchedSkills: {
    skillName: string;
    userProficiency: number;
    requiredProficiency: number;
    importance: string;
    matchRatio: number;
  }[];
  missingSkills: string[];
  explanation: string[];
  whyYouMatch?: StructuredMatchWhy[];
  missingPoints?: StructuredMatchWhy[];
}

export interface TeamCompositionCandidate {
  student: StudentProfile;
  assignedRole: string;
  individualMatchScore: number;
  primaryContributions: string[];
  matchedSkills?: string[];
  fitRationale?: string;
}

export interface TeamSkillCoverage {
  skillName: string;
  importance: string;
  isCovered: boolean;
  coveredBy?: {
    userId: string;
    userName: string;
    proficiency: number;
  };
}

export interface TeamSynergyBreakdown {
  skillCoverage: number;       // 0 to 100 (50% weight)
  roleDiversity: number;       // 0 to 100 (20% weight)
  availabilityOverlap: number; // 0 to 100 (15% weight)
  workingStyleHarmony: number; // 0 to 100 (10% weight)
  experienceBalance: number;   // 0 to 100 (5% weight)
}

export interface TeamCompositionResult {
  projectId: string;
  teamScore: number; // 0 to 100
  skillCoverageRatio: number; // 0 to 1
  roleDiversityScore: number; // 0 to 100
  availabilityOverlapScore: number; // 0 to 100
  synergyBreakdown?: TeamSynergyBreakdown;
  recommendedMembers: TeamCompositionCandidate[];
  skillCoverages: TeamSkillCoverage[];
  gaps: {
    missingSkills: string[];
    missingRoles: string[];
    riskNotes: string[];
  };
  aiExplanation?: string;
}
