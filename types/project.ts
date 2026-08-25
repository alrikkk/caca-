import { Skill, StudentProfile } from './user';

export type ProjectStatus =
  | 'draft'
  | 'recruiting'
  | 'in_progress'
  | 'completed'
  | 'archived';

export type SkillImportance = 'required' | 'preferred' | 'nice_to_have';

export interface ProjectSkillRequirement {
  skill: Skill;
  requiredProficiency: number; // 1 to 5
  importance: SkillImportance;
}

export interface ProjectSlot {
  id: string;
  roleTitle: string;
  assignedMember?: StudentProfile;
  requiredSkills: string[];
  isFilled: boolean;
}

export interface Project {
  id: string;
  ownerId: string;
  owner?: StudentProfile;
  title: string;
  tagline: string;
  description: string;
  category: string;
  status: ProjectStatus;
  maxTeamSize: number;
  durationWeeks: number;
  hoursPerWeek: number;
  bannerUrl?: string;
  githubRepo?: string;
  demoUrl?: string;
  requiredSkills: ProjectSkillRequirement[];
  slots?: ProjectSlot[];
  missingRoles?: string[];
  createdAt: string;
  updatedAt: string;
  // Computed / client matching attributes
  matchScore?: number; // 0-100 individual compatibility with current user
  matchHighlights?: string[];
  matchBreakdown?: {
    skillMatch: number;
    experienceMatch: number;
    availabilityMatch: number;
    interestMatch: number;
    roleMatch: number;
  };
}

export interface ProjectApplication {
  id: string;
  projectId: string;
  project?: Project;
  applicantId: string;
  applicant?: StudentProfile;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  pitchNote?: string;
  compatibilityScore?: number;
  createdAt: string;
}

export interface Team {
  id: string;
  projectId: string;
  project?: Project;
  name: string;
  teamCompatibilityScore?: number;
  members: {
    user: StudentProfile;
    roleTitle: string;
    isLead: boolean;
    joinedAt: string;
  }[];
  createdAt: string;
}
