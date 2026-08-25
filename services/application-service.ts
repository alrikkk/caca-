import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProjectApplication, Project } from "@/types/project";
import { MOCK_PROJECTS } from "@/lib/mock-data";

const LOCAL_APPLICATIONS_KEY = "caca_applications";

export class ApplicationService {
  /**
   * Check if the user has already applied to a given project
   */
  static async hasApplied(projectId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;

    // Check local cache
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
      if (stored) {
        try {
          const apps: ProjectApplication[] = JSON.parse(stored);
          if (apps.some((a) => a.projectId === projectId && a.applicantId === userId)) {
            return true;
          }
        } catch {
          // Ignored
        }
      }
    }

    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("applications")
        .select("id")
        .eq("project_id", projectId)
        .eq("applicant_id", userId)
        .maybeSingle();

      return Boolean(data && !error);
    } catch {
      return false;
    }
  }

  /**
   * Submit an application / express interest in a project
   */
  static async applyToProject(
    projectId: string,
    userId: string,
    compatibilityScore: number = 85,
    pitchNote?: string
  ): Promise<{ success: boolean; application?: ProjectApplication; error?: string }> {
    const newApp: ProjectApplication = {
      id: `app_${Date.now()}`,
      projectId,
      applicantId: userId,
      status: "pending",
      compatibilityScore,
      pitchNote: pitchNote || "Interested in joining this squad.",
      createdAt: new Date().toISOString(),
    };

    // Save locally
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
      let list: ProjectApplication[] = stored ? JSON.parse(stored) : [];
      if (!list.some((a) => a.projectId === projectId && a.applicantId === userId)) {
        list.push(newApp);
        localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(list));
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("applications").insert({
          project_id: projectId,
          applicant_id: userId,
          status: "pending",
          compatibility_score: compatibilityScore,
          pitch_note: pitchNote || null,
        });
      } catch {
        // Handled
      }
    }

    return { success: true, application: newApp };
  }

  /**
   * Fetch all applications submitted by the active user
   */
  static async getMyApplications(userId?: string): Promise<ProjectApplication[]> {
    if (!userId) return [];

    let localApps: ProjectApplication[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
      if (stored) {
        try {
          localApps = JSON.parse(stored).filter(
            (a: ProjectApplication) => a.applicantId === userId
          );
        } catch {
          localApps = [];
        }
      }
    }

    // Attach project metadata
    return localApps.map((app) => {
      const proj = MOCK_PROJECTS.find((p) => p.id === app.projectId) || {
        id: app.projectId,
        title: "Project",
        tagline: "",
        category: "General",
      } as Project;
      return { ...app, project: proj };
    });
  }
}
