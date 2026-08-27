import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";

export class ProjectService {
  /**
   * Returns list of projects with dynamic compatibility calculated for the specified student
   */
  static async getFeedProjects(currentStudent?: StudentProfile | null): Promise<Project[]> {
    return MOCK_PROJECTS.map((project) => {
      if (!currentStudent) {
        return {
          ...project,
          matchScore: 80,
        };
      }

      const match = defaultMatchingEngine.calculateIndividualMatch(currentStudent, project);
      const whyItems = (match.whyYouMatch || []).map((w) => w.title);

      return {
        ...project,
        matchScore: match.overallScore,
        matchHighlights: match.explanation,
        whyMatchItems: whyItems,
        groundedSummary: match.groundedSummary,
        strongestOverlap: match.strongestOverlap,
        roleGapInsight: match.roleGapInsight,
        scheduleOverlapInsight: match.scheduleOverlapInsight,
        matchBreakdown: {
          skillMatch: match.breakdown.skillScore,
          experienceMatch: match.breakdown.experienceScore,
          availabilityMatch: match.breakdown.availabilityScore,
          interestMatch: match.breakdown.interestScore,
          roleMatch: match.breakdown.roleScore,
        },
      };
    });
  }

  /**
   * Get project details by ID with dynamic score calculated for active student
   */
  static async getProjectById(
    projectId: string,
    currentStudent?: StudentProfile | null
  ): Promise<Project | null> {
    const project = MOCK_PROJECTS.find((p) => p.id === projectId);
    if (!project) return null;

    if (!currentStudent) return project;

    const match = defaultMatchingEngine.calculateIndividualMatch(currentStudent, project);
    const whyItems = (match.whyYouMatch || []).map((w) => w.title);

    return {
      ...project,
      matchScore: match.overallScore,
      matchHighlights: match.explanation,
      whyMatchItems: whyItems,
      groundedSummary: match.groundedSummary,
      strongestOverlap: match.strongestOverlap,
      roleGapInsight: match.roleGapInsight,
      scheduleOverlapInsight: match.scheduleOverlapInsight,
      matchBreakdown: {
        skillMatch: match.breakdown.skillScore,
        experienceMatch: match.breakdown.experienceScore,
        availabilityMatch: match.breakdown.availabilityScore,
        interestMatch: match.breakdown.interestScore,
        roleMatch: match.breakdown.roleScore,
      },
    };
  }
}
