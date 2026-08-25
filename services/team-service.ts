import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { MOCK_PROJECTS } from "@/lib/mock-data";

const LOCAL_TEAMS_KEY = "caca_user_teams";

export interface TeamRecord {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  role: string;
  isLead: boolean;
  membersCount: number;
  maxMembers: number;
  compatibilityScore: number;
  createdAt: string;
}

export class TeamService {
  /**
   * Creates a new team for a project with the creator as the lead member
   */
  static async createTeam(params: {
    projectId: string;
    projectName?: string;
    teamName: string;
    creatorId: string;
    roleTitle?: string;
    compatibilityScore?: number;
  }): Promise<{ success: boolean; team?: TeamRecord; error?: string }> {
    if (!params.teamName.trim()) {
      return { success: false, error: "Team name is required." };
    }

    const proj = MOCK_PROJECTS.find((p) => p.id === params.projectId);
    const projectName = params.projectName || proj?.title || "Project Squad";
    const teamId = `team_${Date.now()}`;
    const roleTitle = params.roleTitle || "Squad Lead";
    const compatibilityScore = params.compatibilityScore ?? 92;

    const newTeam: TeamRecord = {
      id: teamId,
      projectId: params.projectId,
      projectName,
      name: params.teamName.trim(),
      role: roleTitle,
      isLead: true,
      membersCount: 1,
      maxMembers: proj?.maxTeamSize || 4,
      compatibilityScore,
      createdAt: new Date().toISOString(),
    };

    // Save in local storage cache
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_TEAMS_KEY);
      let list: TeamRecord[] = stored ? JSON.parse(stored) : [];
      // Prevent duplicate team creation for same project by same user
      if (!list.some((t) => t.projectId === params.projectId && t.name === newTeam.name)) {
        list.push(newTeam);
        localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(list));
      }
    }

    // Attempt Supabase insert if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({
            project_id: params.projectId,
            name: newTeam.name,
            team_compatibility_score: compatibilityScore,
          })
          .select("id")
          .maybeSingle();

        if (!teamError && teamData?.id) {
          await supabase.from("team_members").insert({
            team_id: teamData.id,
            user_id: params.creatorId,
            role_title: roleTitle,
            is_lead: true,
          });
        }
      } catch {
        // Handled via local storage persistence fallback
      }
    }

    return { success: true, team: newTeam };
  }

  /**
   * Retrieves all teams the user is part of
   */
  static async getMyTeams(userId?: string): Promise<TeamRecord[]> {
    if (!userId) return [];

    let localTeams: TeamRecord[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_TEAMS_KEY);
      if (stored) {
        try {
          localTeams = JSON.parse(stored);
        } catch {
          localTeams = [];
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: memberRows, error } = await supabase
          .from("team_members")
          .select(`
            id,
            role_title,
            is_lead,
            teams (
              id,
              name,
              project_id,
              team_compatibility_score,
              created_at,
              projects ( title, max_team_size )
            )
          `)
          .eq("user_id", userId);

        if (!error && memberRows) {
          const dbTeams: TeamRecord[] = memberRows
            .filter((m: any) => m.teams)
            .map((m: any) => ({
              id: m.teams.id,
              projectId: m.teams.project_id,
              projectName: m.teams.projects?.title || "Project Squad",
              name: m.teams.name,
              role: m.role_title,
              isLead: Boolean(m.is_lead),
              membersCount: 1,
              maxMembers: m.teams.projects?.max_team_size || 4,
              compatibilityScore: Number(m.teams.team_compatibility_score || 90),
              createdAt: m.teams.created_at,
            }));

          // Merge without duplicate IDs
          const existingIds = new Set(dbTeams.map((t) => t.id));
          const filteredLocal = localTeams.filter((t) => !existingIds.has(t.id));
          return [...dbTeams, ...filteredLocal];
        }
      } catch {
        // Return local list
      }
    }

    return localTeams;
  }
}
