import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { MOCK_PROJECTS } from "@/lib/mock-data";

const LOCAL_TEAMS_KEY = "caca_user_teams";
const LOCAL_STORAGE_DEMO_KEY = "caca_is_demo_mode";

function toProjectUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const match = id.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  const hex = num.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex}`;
}

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

export interface TeamMemberDetails {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  college?: string;
  major?: string;
  roleTitle: string;
  isLead: boolean;
  skills?: Array<{ name: string; proficiency: number }>;
  joinedAt: string;
}

export interface TeamWithMembers extends TeamRecord {
  members: TeamMemberDetails[];
  synergyScore: number;
}

interface TeamMemberQueryResult {
  id: string;
  user_id: string;
  role_title: string;
  is_lead: boolean;
  created_at?: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    college: string | null;
    major: string | null;
  } | null;
  teams: {
    id: string;
    name: string;
    project_id: string;
    team_compatibility_score: number | null;
    created_at: string;
    projects: { title: string; max_team_size: number } | null;
  } | null;
}

export class TeamService {
  /**
   * Helper to check if Demo Mode is active
   */
  private static checkIsDemo(): boolean {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true")
      );
    }
    return false;
  }

  /**
   * Creates a new squad/team for a project with verified idempotency and lead assignment
   */
  static async createTeam(params: {
    projectId: string;
    projectName?: string;
    teamName: string;
    creatorId: string;
    roleTitle?: string;
    compatibilityScore?: number;
  }): Promise<{ success: boolean; team?: TeamRecord; error?: string; isExisting?: boolean }> {
    const cleanTeamName = params.teamName.trim();
    if (!cleanTeamName) {
      return { success: false, error: "Team name is required." };
    }

    if (!params.projectId || !params.creatorId) {
      return { success: false, error: "Missing project ID or creator ID." };
    }

    const proj = MOCK_PROJECTS.find((p) => p.id === params.projectId);
    const projectName = params.projectName || proj?.title || "Project Squad";
    const teamId = `team_${Date.now()}`;
    const roleTitle = params.roleTitle?.trim() || "Squad Lead";
    const compatibilityScore = params.compatibilityScore ?? 92;

    const newTeam: TeamRecord = {
      id: teamId,
      projectId: params.projectId,
      projectName,
      name: cleanTeamName,
      role: roleTitle,
      isLead: true,
      membersCount: 1,
      maxMembers: proj?.maxTeamSize || 4,
      compatibilityScore,
      createdAt: new Date().toISOString(),
    };

    // Check local storage for existing squad on this project (Idempotency)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_TEAMS_KEY);
        if (stored) {
          const list: TeamRecord[] = JSON.parse(stored);
          const existingLocal = list.find((t) => t.projectId === params.projectId);
          if (existingLocal) {
            return {
              success: true,
              team: existingLocal,
              isExisting: true,
            };
          }
        }
      } catch (err) {
        console.error("TeamService.createTeam (local check) error:", err);
      }
    }

    const isDemo = this.checkIsDemo();

    // 1. Supabase Persistence with strict Idempotency Checks
    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();
        const uuid = toProjectUuid(params.projectId);
        const teamsTable = supabase.from("teams") as any;

        // Pre-check: Check if a team/squad already exists for this project if select supported
        if (typeof teamsTable.select === "function") {
          try {
            const { data: existingTeam } = await teamsTable
              .select(`
                id,
                name,
                project_id,
                team_compatibility_score,
                created_at,
                team_members (
                  id,
                  user_id,
                  role_title,
                  is_lead
                )
              `)
              .eq("project_id", uuid)
              .maybeSingle();

            if (existingTeam) {
              const members = (existingTeam.team_members as any[]) || [];
              const userMember = members.find((m) => m.user_id === params.creatorId);
              const isUserLead = Boolean(userMember?.is_lead);

              const existingTeamRecord: TeamRecord = {
                id: existingTeam.id,
                projectId: params.projectId,
                projectName,
                name: existingTeam.name,
                role: userMember?.role_title || (isUserLead ? "Squad Lead" : "Member"),
                isLead: isUserLead,
                membersCount: members.length || 1,
                maxMembers: proj?.maxTeamSize || 4,
                compatibilityScore: Number(existingTeam.team_compatibility_score || 90),
                createdAt: existingTeam.created_at,
              };

              return {
                success: true,
                team: existingTeamRecord,
                isExisting: true,
              };
            }
          } catch {
            // Ignore pre-check failure and proceed to insert
          }
        }

        // Insert new team
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .insert({
            project_id: uuid,
            name: cleanTeamName,
            team_compatibility_score: compatibilityScore,
          })
          .select("id")
          .maybeSingle();

        if (teamError) {
          console.error("TeamService.createTeam insert error:", teamError);
          if (
            teamError.message?.includes("teams_project_id_key") ||
            teamError.message?.includes("duplicate key") ||
            (teamError as any).code === "23505"
          ) {
            return {
              success: false,
              error: "SQUAD ALREADY EXISTS. A squad has already been established for this project.",
              isExisting: true,
            };
          }
          return { success: false, error: "Couldn't create the squad — please try again." };
        }

        if (teamData?.id) {
          newTeam.id = teamData.id;

          // Insert team creator into team_members as lead
          const { error: memberError } = await supabase.from("team_members").insert({
            team_id: teamData.id,
            user_id: params.creatorId,
            role_title: roleTitle,
            is_lead: true,
          });

          if (memberError) {
            console.error("TeamService.createTeam member insert error:", memberError);
            return { success: false, error: "Squad created, but failed to assign lead membership." };
          }
        }
      } catch (err) {
        console.error("TeamService.createTeam exception:", err);
        return { success: false, error: "Couldn't create the squad — please try again." };
      }
    }

    // 2. Save in local storage cache
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_TEAMS_KEY);
        let list: TeamRecord[] = stored ? JSON.parse(stored) : [];
        if (!list.some((t) => t.id === newTeam.id || t.projectId === params.projectId)) {
          list.unshift(newTeam);
          localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(list));
        }
      } catch (err) {
        console.error("TeamService.createTeam (local save) failed:", err);
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
        } catch (err) {
          console.error("TeamService.getMyTeams (local parse) failed:", err);
          localTeams = [];
        }
      }
    }

    if (isSupabaseConfigured() && !this.checkIsDemo()) {
      try {
        const supabase = createClient();
        const { data: memberRows, error } = await supabase
          .from("team_members")
          .select(`
            id,
            user_id,
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

        if (error) {
          console.error("TeamService.getMyTeams query error:", error);
        } else if (memberRows && memberRows.length > 0) {
          const typedMembers = memberRows as unknown as TeamMemberQueryResult[];
          const dbTeams: TeamRecord[] = typedMembers
            .filter((m): m is TeamMemberQueryResult & { teams: NonNullable<TeamMemberQueryResult["teams"]> } => Boolean(m.teams))
            .map((m) => {
              const rawProjId = m.teams.project_id;
              const matchedMock = MOCK_PROJECTS.find(
                (p) => p.id === rawProjId || toProjectUuid(p.id) === rawProjId
              );
              return {
                id: m.teams.id,
                projectId: matchedMock?.id || m.teams.project_id,
                projectName: m.teams.projects?.title || matchedMock?.title || "Project Squad",
                name: m.teams.name,
                role: m.role_title,
                isLead: Boolean(m.is_lead),
                membersCount: 1,
                maxMembers: m.teams.projects?.max_team_size || matchedMock?.maxTeamSize || 4,
                compatibilityScore: Number(m.teams.team_compatibility_score || 90),
                createdAt: m.teams.created_at,
              };
            });

          const existingIds = new Set(dbTeams.map((t) => t.id));
          const filteredLocal = localTeams.filter((t) => !existingIds.has(t.id));
          return [...dbTeams, ...filteredLocal];
        }
      } catch (err) {
        console.error("TeamService.getMyTeams failed:", err);
      }
    }

    return localTeams;
  }

  /**
   * Adds a member to a team
   */
  static async addMemberToTeam(params: {
    teamId: string;
    userId: string;
    roleTitle?: string;
    isLead?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const roleTitle = params.roleTitle?.trim() || "Squad Member";
    const isLead = Boolean(params.isLead);

    if (isSupabaseConfigured() && !this.checkIsDemo()) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("team_members").insert({
          team_id: params.teamId,
          user_id: params.userId,
          role_title: roleTitle,
          is_lead: isLead,
        });

        if (error) {
          console.error("TeamService.addMemberToTeam DB error:", error);
          return { success: false, error: "Could not add member to squad." };
        }
      } catch (err) {
        console.error("TeamService.addMemberToTeam exception:", err);
        return { success: false, error: "Failed to add member to team." };
      }
    }

    return { success: true };
  }

  /**
   * Updates a team member's assigned role with authorization verification
   */
  static async updateMemberRole(params: {
    teamId: string;
    userId: string;
    newRoleTitle: string;
    requesterId: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!params.newRoleTitle.trim()) {
      return { success: false, error: "Role title cannot be empty." };
    }

    if (isSupabaseConfigured() && !this.checkIsDemo()) {
      try {
        const supabase = createClient();

        // 1. Authorization check: requester must be a lead of this team
        const { data: requesterMember, error: authError } = await supabase
          .from("team_members")
          .select("is_lead")
          .eq("team_id", params.teamId)
          .eq("user_id", params.requesterId)
          .maybeSingle();

        if (authError || !requesterMember?.is_lead) {
          return { success: false, error: "Only team leads can update member roles." };
        }

        // 2. Perform role update
        const { error: updateError } = await supabase
          .from("team_members")
          .update({ role_title: params.newRoleTitle.trim() })
          .eq("team_id", params.teamId)
          .eq("user_id", params.userId);

        if (updateError) {
          console.error("TeamService.updateMemberRole DB error:", updateError);
          return { success: false, error: "Could not update member role." };
        }
      } catch (err) {
        console.error("TeamService.updateMemberRole exception:", err);
        return { success: false, error: "Failed to update role." };
      }
    }

    return { success: true };
  }

  /**
   * Removes a member from a team with authorization verification
   */
  static async removeMemberFromTeam(params: {
    teamId: string;
    userId: string;
    requesterId: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && !this.checkIsDemo()) {
      try {
        const supabase = createClient();

        // Authorization check: requester must be lead OR removing self
        if (params.requesterId !== params.userId) {
          const { data: requesterMember, error: authError } = await supabase
            .from("team_members")
            .select("is_lead")
            .eq("team_id", params.teamId)
            .eq("user_id", params.requesterId)
            .maybeSingle();

          if (authError || !requesterMember?.is_lead) {
            return { success: false, error: "Only team leads can remove other members." };
          }
        }

        const { error: deleteError } = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", params.teamId)
          .eq("user_id", params.userId);

        if (deleteError) {
          console.error("TeamService.removeMemberFromTeam DB error:", deleteError);
          return { success: false, error: "Could not remove member from squad." };
        }
      } catch (err) {
        console.error("TeamService.removeMemberFromTeam exception:", err);
        return { success: false, error: "Failed to remove member." };
      }
    }

    return { success: true };
  }

  /**
   * Deletes a team/squad with lead authorization check and safe cascading
   */
  static async deleteTeam(params: {
    teamId: string;
    requesterId: string;
  }): Promise<{ success: boolean; error?: string }> {
    // 1. Local Cache Deletion
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_TEAMS_KEY);
        if (stored) {
          const list: TeamRecord[] = JSON.parse(stored);
          const filtered = list.filter((t) => t.id !== params.teamId);
          localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(filtered));
        }
      } catch (err) {
        console.warn("Could not delete from local storage:", err);
      }
    }

    // 2. Supabase DB Deletion
    if (isSupabaseConfigured() && !this.checkIsDemo()) {
      try {
        const supabase = createClient();

        // Check if requester is lead
        const { data: member, error: authError } = await supabase
          .from("team_members")
          .select("is_lead")
          .eq("team_id", params.teamId)
          .eq("user_id", params.requesterId)
          .maybeSingle();

        if (authError || !member?.is_lead) {
          return { success: false, error: "Only the squad lead can delete this squad." };
        }

        // Delete team (cascades to team_members)
        const { error: delError } = await supabase
          .from("teams")
          .delete()
          .eq("id", params.teamId);

        if (delError) {
          return { success: false, error: "Could not delete squad." };
        }
      } catch (err) {
        console.error("deleteTeam exception:", err);
        return { success: false, error: "Failed to delete squad." };
      }
    }

    return { success: true };
  }
}
