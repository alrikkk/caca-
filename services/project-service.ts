import { Project } from "@/types/project";
import { StudentProfile } from "@/types/user";
import { MOCK_PROJECTS, CURRENT_USER } from "@/lib/mock-data";
import { defaultMatchingEngine } from "@/matching/engine";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_PUBLISHED_PROJECTS_KEY = "caca_published_projects";

export class ProjectService {
  /**
   * Create and publish a project with Supabase and local storage dual-layer persistence
   */
  static async createProject(
    data: {
      title: string;
      tagline?: string;
      description: string;
      category: string;
      maxTeamSize?: number;
      durationWeeks?: number;
      hoursPerWeek?: number;
      bannerUrl?: string;
      requiredSkills?: Array<{
        name: string;
        category?: string;
        requiredProficiency?: number;
        importance?: "required" | "preferred" | "nice_to_have";
      }>;
      missingRoles?: string[];
      status?: "draft" | "published" | "recruiting";
    },
    owner?: StudentProfile | null,
    isDemo: boolean = false
  ): Promise<{ success: boolean; project?: Project; error?: string }> {
    const creator = owner || CURRENT_USER;
    const projectId = `proj_${Date.now()}`;
    const status = data.status || "published";

    const newProject: Project = {
      id: projectId,
      ownerId: creator.id,
      owner: creator,
      title: data.title,
      tagline: data.tagline || data.description.slice(0, 80),
      description: data.description,
      category: data.category || "General Engineering",
      status: status as any,
      maxTeamSize: data.maxTeamSize || 4,
      durationWeeks: data.durationWeeks || 8,
      hoursPerWeek: data.hoursPerWeek || 12,
      bannerUrl: data.bannerUrl || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
      requiredSkills: (data.requiredSkills || []).map((s, idx) => ({
        skill: {
          id: `sk_req_${idx}`,
          name: s.name,
          category: s.category || "frontend",
        },
        requiredProficiency: s.requiredProficiency || 3,
        importance: s.importance || "required",
      })),
      slots: (data.missingRoles || []).map((role, idx) => ({
        id: `slot_${projectId}_${idx}`,
        roleTitle: role,
        requiredSkills: [role],
        isFilled: false,
      })),
      missingRoles: data.missingRoles || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      matchScore: 95,
      matchHighlights: ["Newly published project matching your core tech stack!"],
    };

    // Save to local storage for immediate offline/client feed visibility
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_PUBLISHED_PROJECTS_KEY);
        const list: Project[] = stored ? JSON.parse(stored) : [];
        const filtered = list.filter((p) => p.id !== newProject.id);
        localStorage.setItem(
          LOCAL_PUBLISHED_PROJECTS_KEY,
          JSON.stringify([newProject, ...filtered])
        );
      } catch (err) {
        console.warn("Could not save project to local storage:", err);
      }
    }

    // Attempt Supabase insert if online and configured
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("projects").insert({
          id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId) ? projectId : undefined,
          owner_id: creator.id,
          title: newProject.title,
          description: newProject.description,
          category: newProject.category,
          status: newProject.status,
          max_team_size: newProject.maxTeamSize,
          duration_weeks: newProject.durationWeeks,
          hours_per_week: newProject.hoursPerWeek,
          banner_url: newProject.bannerUrl,
        });
      } catch (err) {
        // Fallback gracefully to local storage
      }
    }

    return { success: true, project: newProject };
  }

  /**
   * Returns list of projects with dynamic compatibility calculated for the specified student
   */
  static async getFeedProjects(currentStudent?: StudentProfile | null): Promise<Project[]> {
    let localPublished: Project[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_PUBLISHED_PROJECTS_KEY);
        if (stored) {
          localPublished = JSON.parse(stored);
        }
      } catch (err) {
        localPublished = [];
      }
    }

    // Combine static catalog with published projects, deduplicating by ID
    const combinedMap = new Map<string, Project>();
    for (const p of MOCK_PROJECTS) {
      combinedMap.set(p.id, p);
    }
    for (const p of localPublished) {
      if (p.status !== "draft") {
        combinedMap.set(p.id, p);
      }
    }

    const allProjects = Array.from(combinedMap.values());

    return allProjects.map((project) => {
      if (!currentStudent) {
        return {
          ...project,
          matchScore: project.matchScore ?? 80,
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
    let localPublished: Project[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_PUBLISHED_PROJECTS_KEY);
        if (stored) {
          localPublished = JSON.parse(stored);
        }
      } catch (err) {
        localPublished = [];
      }
    }

    const project =
      localPublished.find((p) => p.id === projectId) ||
      MOCK_PROJECTS.find((p) => p.id === projectId);

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
