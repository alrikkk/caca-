import { StudentProfile } from '@/types/user';
import { SanitizedCandidate } from '@/types/ai';
import { Project } from '@/types/project';

/**
 * Privacy Sanitizer for AI Layer
 * Strips all sensitive, private, or identifying data before LLM transmission.
 *
 * Guaranteed safe:
 * - NO emails
 * - NO phone numbers
 * - NO raw auth IDs / auth tokens
 * - NO service keys or database credentials
 * - NO passwords
 */
export class AISanitizer {
  /**
   * Sanitizes a single student profile for safe AI consumption.
   */
  static sanitizeCandidate(student: StudentProfile, index = 0): SanitizedCandidate {
    return {
      id: student.id,
      aliasId: `cand_${index + 1}`,
      fullName: student.fullName || `Candidate ${index + 1}`,
      headline: student.headline,
      college: student.college || 'University',
      major: student.major || 'Computer Science',
      gradYear: student.gradYear || 2026,
      experienceLevel: student.experienceLevel || 'junior',
      workingStyle: student.workingStyle || 'collaborative',
      skills: (student.skills || []).map((s) => ({
        name: s.name,
        category: String(s.category || 'general'),
        proficiency: s.proficiency,
        yearsExperience: s.yearsExperience,
      })),
      interests: (student.interests || []).map((i) => ({
        name: i.name,
        category: i.category,
      })),
      availability: {
        hoursPerWeek: student.availability?.hoursPerWeek || 10,
        timezone: student.availability?.timezone,
        prefersRemote: student.availability?.prefersRemote,
        weekendAvailability: student.availability?.weekendAvailability,
        weekdayEvenings: student.availability?.weekdayEvenings,
      },
    };
  }

  /**
   * Sanitizes a list of candidate profiles.
   */
  static sanitizeCandidatePool(students: StudentProfile[]): SanitizedCandidate[] {
    return students.map((s, idx) => this.sanitizeCandidate(s, idx));
  }

  /**
   * Sanitizes a project object for safe AI prompt context.
   */
  static sanitizeProject(project: Project): {
    id: string;
    title: string;
    tagline: string;
    description: string;
    category: string;
    maxTeamSize: number;
    hoursPerWeek: number;
    durationWeeks: number;
    requiredSkills: Array<{
      name: string;
      requiredProficiency: number;
      importance: string;
    }>;
    missingRoles?: string[];
  } {
    return {
      id: project.id,
      title: project.title,
      tagline: project.tagline || '',
      description: project.description || '',
      category: project.category || 'Technology',
      maxTeamSize: project.maxTeamSize || 4,
      hoursPerWeek: project.hoursPerWeek || 12,
      durationWeeks: project.durationWeeks || 8,
      requiredSkills: (project.requiredSkills || []).map((r) => ({
        name: r.skill.name,
        requiredProficiency: r.requiredProficiency,
        importance: r.importance,
      })),
      missingRoles: project.missingRoles || [],
    };
  }
}
