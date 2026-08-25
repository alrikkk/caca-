export type ExperienceLevel =
  | 'freshman'
  | 'sophomore'
  | 'junior'
  | 'senior'
  | 'grad'
  | 'alumni';

export type WorkingStyle =
  | 'independent'
  | 'collaborative'
  | 'structured'
  | 'fast-paced'
  | 'mentor-oriented';

export type SkillCategory =
  | 'frontend'
  | 'backend'
  | 'ml_ai'
  | 'design'
  | 'mobile'
  | 'hardware'
  | 'product'
  | 'marketing'
  | 'data';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory | string;
}

export interface UserSkill extends Skill {
  proficiency: number; // 1 (Beginner) to 5 (Expert)
  yearsExperience: number;
  verified?: boolean;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
}

export interface TimeWindow {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // "18:00"
  endTime: string;   // "22:00"
}

export interface Availability {
  hoursPerWeek: number;
  timezone: string;
  prefersRemote: boolean;
  weekendAvailability: boolean;
  weekdayEvenings: boolean;
  scheduleWindows?: TimeWindow[];
}

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string;
  headline?: string;
  college: string;
  major: string;
  gradYear: number;
  experienceLevel: ExperienceLevel;
  workingStyle: WorkingStyle;
  bio?: string;
  avatarUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  skills: UserSkill[];
  interests: Interest[];
  availability: Availability;
  created_at?: string;
}
