import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { withSupabaseFallback } from "@/lib/data-access";
import { ProjectApplication, Project } from "@/types/project";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { Database } from "@/types/database.types";

const LOCAL_APPLICATIONS_KEY = "caca_applications";

function toProjectUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const match = id.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  const hex = num.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex}`;
}

export class ApplicationService {
  /**
   * Check if the user has already applied to a given project
   */
  static async hasApplied(projectId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;

    const checkLocal = (): boolean => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
        if (stored) {
          try {
            const apps: ProjectApplication[] = JSON.parse(stored);
            if (
              apps.some(
                (a) =>
                  (a.projectId === projectId ||
                    toProjectUuid(a.projectId) === toProjectUuid(projectId)) &&
                  a.applicantId === userId
              )
            ) {
              return true;
            }
          } catch (err) {
            console.error("ApplicationService.hasApplied (local check) failed:", err);
          }
        }
      }
      return false;
    };

    return withSupabaseFallback(
      async () => {
        const supabase = createClient();
        const uuid = toProjectUuid(projectId);
        const { data, error } = await supabase
          .from("applications")
          .select("id")
          .eq("project_id", uuid)
          .eq("applicant_id", userId)
          .maybeSingle();

        if (error) {
          console.error("ApplicationService.hasApplied query error:", error);
          return checkLocal();
        }
        return Boolean(data);
      },
      () => checkLocal(),
      "ApplicationService.hasApplied"
    );
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
        const uuid = toProjectUuid(projectId);
        const { error } = await supabase.from("applications").upsert(
          {
            project_id: uuid,
            applicant_id: userId,
            status: "pending",
            compatibility_score: compatibilityScore,
            pitch_note: pitchNote || null,
          },
          { onConflict: "project_id,applicant_id" }
        );

        if (error) {
          console.warn("Database application sync warning:", error.message);
        }
      } catch (err) {
        console.error("ApplicationService.applyToProject failed:", err);
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
        } catch (err) {
          console.error("ApplicationService.getMyApplications (local parse) failed:", err);
          localApps = [];
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: dbApps, error } = await supabase
          .from("applications")
          .select(`
            id,
            project_id,
            applicant_id,
            status,
            compatibility_score,
            pitch_note,
            created_at,
            projects ( id, title, tagline, category )
          `)
          .eq("applicant_id", userId);

        if (error) {
          console.error("ApplicationService.getMyApplications query error:", error);
        } else if (dbApps && dbApps.length > 0) {
          type ApplicationRowWithProject = Database["public"]["Tables"]["applications"]["Row"] & {
            projects: { id: string; title: string; tagline: string; category: string } | null;
          };

          const mappedDb: ProjectApplication[] = (dbApps as unknown as ApplicationRowWithProject[]).map((row) => {
            const rawProjId = row.project_id;
            const matchedMock = MOCK_PROJECTS.find(
              (p) => p.id === rawProjId || toProjectUuid(p.id) === rawProjId
            );
            const proj: Project = matchedMock || {
              id: row.project_id,
              ownerId: "00000000-0000-0000-0000-000000000000",
              title: row.projects?.title || "Project",
              tagline: row.projects?.tagline || "",
              description: "",
              category: row.projects?.category || "General",
              status: "recruiting",
              maxTeamSize: 4,
              durationWeeks: 8,
              hoursPerWeek: 10,
              requiredSkills: [],
              createdAt: row.created_at,
              updatedAt: row.created_at,
            };

            return {
              id: row.id,
              projectId: matchedMock?.id || row.project_id,
              applicantId: row.applicant_id,
              status: row.status,
              compatibilityScore: Number(row.compatibility_score || 85),
              pitchNote: row.pitch_note || undefined,
              createdAt: row.created_at,
              project: proj,
            };
          });

          const existingProjectIds = new Set(mappedDb.map((a) => a.projectId));
          const filteredLocal = localApps.filter((a) => !existingProjectIds.has(a.projectId));
          return [...mappedDb, ...filteredLocal];
        }
      } catch (err) {
        console.error("ApplicationService.getMyApplications failed:", err);
      }
    }

    // Attach project metadata
    return localApps.map((app) => {
      const proj = MOCK_PROJECTS.find((p) => p.id === app.projectId) || ({
        id: app.projectId,
        title: "Project",
        tagline: "",
        category: "General",
      } as Project);
      return { ...app, project: proj };
    });
  }
}
