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

    // Trigger notification to project owner
    try {
      const proj = MOCK_PROJECTS.find((p) => p.id === projectId || toProjectUuid(p.id) === toProjectUuid(projectId));
      if (proj && proj.ownerId && proj.ownerId !== userId) {
        const { NotificationService } = await import("./notification-service");
        const { MOCK_STUDENTS } = await import("@/lib/mock-data");
        const applicantStudent = MOCK_STUDENTS.find((s) => s.id === userId);
        const applicantName = applicantStudent?.fullName || "A candidate";
        await NotificationService.createNotification({
          userId: proj.ownerId,
          actorId: userId,
          actorName: applicantName,
          actorAvatarUrl: applicantStudent?.avatarUrl,
          title: "New Project Application",
          message: `${applicantName} applied to join your project "${proj.title}".`,
          type: "application_status",
          link: `/projects/${projectId}`,
        });
      }
    } catch {
      // Notification is non-blocking
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

  /**
   * Fetch all applications submitted to a project owned by the user
   */
  static async getProjectApplications(projectId: string, ownerId?: string): Promise<ProjectApplication[]> {
    if (!projectId) return [];

    let localApps: ProjectApplication[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
      if (stored) {
        try {
          localApps = JSON.parse(stored).filter(
            (a: ProjectApplication) =>
              a.projectId === projectId || toProjectUuid(a.projectId) === toProjectUuid(projectId)
          );
        } catch (err) {
          console.error("ApplicationService.getProjectApplications local parse error:", err);
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const uuid = toProjectUuid(projectId);
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
            profiles!applications_applicant_id_fkey ( id, full_name, avatar_url, college, major, experience_level )
          `)
          .eq("project_id", uuid);

        if (error) {
          console.error("ApplicationService.getProjectApplications DB error:", error);
        } else if (dbApps) {
          const mapped: ProjectApplication[] = dbApps.map((row: any) => ({
            id: row.id,
            projectId,
            applicantId: row.applicant_id,
            status: row.status,
            compatibilityScore: Number(row.compatibility_score || 85),
            pitchNote: row.pitch_note || undefined,
            createdAt: row.created_at,
            applicant: row.profiles
              ? {
                  id: row.profiles.id,
                  email: "",
                  fullName: row.profiles.full_name,
                  avatarUrl: row.profiles.avatar_url || undefined,
                  college: row.profiles.college || "University",
                  major: row.profiles.major || "Computer Science",
                  gradYear: 2026,
                  experienceLevel: row.profiles.experience_level || "junior",
                  workingStyle: "collaborative",
                  availability: {
                    hoursPerWeek: 10,
                    timezone: "UTC",
                    prefersRemote: true,
                    weekendAvailability: true,
                    weekdayEvenings: true,
                  },
                  skills: [],
                  interests: [],
                }
              : undefined,
          }));

          const dbIds = new Set(mapped.map((a) => a.id));
          const remainingLocal = localApps.filter((a) => !dbIds.has(a.id));
          return [...mapped, ...remainingLocal];
        }
      } catch (err) {
        console.error("ApplicationService.getProjectApplications exception:", err);
      }
    }

    return localApps;
  }

  /**
   * Review & respond to a project application (accept or reject)
   */
  static async respondToApplication(params: {
    applicationId: string;
    projectId: string;
    action: "accepted" | "rejected";
    ownerId: string;
    roleTitle?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { applicationId, projectId, action, ownerId, roleTitle } = params;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const projUuid = toProjectUuid(projectId);

        // 1. Get application details
        const { data: appData, error: fetchErr } = await supabase
          .from("applications")
          .select("*, projects(title, owner_id)")
          .eq("id", applicationId)
          .maybeSingle();

        if (fetchErr || !appData) {
          console.error("ApplicationService.respondToApplication fetch error:", fetchErr);
          return { success: false, error: "Application not found." };
        }

        // 2. Authorization check: must be project owner
        if (appData.projects?.owner_id && appData.projects.owner_id !== ownerId) {
          return { success: false, error: "Only the project owner can process applications." };
        }

        // 3. Update application status
        const { error: updateErr } = await supabase
          .from("applications")
          .update({ status: action })
          .eq("id", applicationId);

        if (updateErr) {
          console.error("ApplicationService.respondToApplication update error:", updateErr);
          return { success: false, error: updateErr.message };
        }

        // 4. On acceptance, find or create team and enroll applicant
        if (action === "accepted") {
          let teamId: string | null = null;
          const { data: existingTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("project_id", projUuid)
            .maybeSingle();

          if (existingTeam?.id) {
            teamId = existingTeam.id;
          } else {
            const { data: createdTeam } = await supabase
              .from("teams")
              .insert({
                project_id: projUuid,
                name: `${appData.projects?.title || "Project"} Squad`,
                team_compatibility_score: appData.compatibility_score || 90,
              })
              .select("id")
              .maybeSingle();

            if (createdTeam?.id) {
              teamId = createdTeam.id;
              // Add owner as squad lead
              await supabase.from("team_members").insert({
                team_id: createdTeam.id,
                user_id: ownerId,
                role_title: "Squad Lead",
                is_lead: true,
              });
            }
          }

          if (teamId) {
            await supabase.from("team_members").upsert({
              team_id: teamId,
              user_id: appData.applicant_id,
              role_title: roleTitle || "Squad Member",
              is_lead: false,
            });
          }

          // In-app notification to applicant
          const { NotificationService } = await import("./notification-service");
          await NotificationService.createNotification({
            userId: appData.applicant_id,
            title: "Application Accepted! 🎉",
            message: `Your application to join "${appData.projects?.title || "the project"}" was accepted!`,
            type: "application_status",
            link: "/teams",
          });
        } else {
          // On rejection notification
          const { NotificationService } = await import("./notification-service");
          await NotificationService.createNotification({
            userId: appData.applicant_id,
            title: "Application Update",
            message: `Your application to "${appData.projects?.title || "the project"}" was reviewed.`,
            type: "application_status",
            link: "/teams",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("ApplicationService.respondToApplication exception:", err);
        return { success: false, error: msg };
      }
    }

    // Local cache update
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_APPLICATIONS_KEY);
        if (stored) {
          const list: ProjectApplication[] = JSON.parse(stored);
          const updated = list.map((a) =>
            a.id === applicationId ? { ...a, status: action } : a
          );
          localStorage.setItem(LOCAL_APPLICATIONS_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.error("ApplicationService.respondToApplication local update error:", err);
      }
    }

    return { success: true };
  }
}
