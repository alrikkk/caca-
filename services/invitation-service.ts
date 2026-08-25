import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { NotificationService } from "./notification-service";
import { MOCK_PROJECTS } from "@/lib/mock-data";

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  projectId: string;
  projectName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  roleTitle: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

interface TeamInvitationQueryResult {
  id: string;
  team_id: string;
  project_id: string;
  inviter_id: string;
  invitee_id: string;
  role_title: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  teams: { id: string; name: string } | null;
  projects: { id: string; title: string } | null;
  profiles: { full_name: string } | null;
}

const LOCAL_INVITES_KEY = "caca_user_invitations";

function toProjectUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const match = id.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  const hex = num.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex}`;
}

export class InvitationService {
  /**
   * Invites a registered student to a squad
   */
  static async sendInvitation(params: {
    teamId: string;
    teamName?: string;
    projectId: string;
    projectName?: string;
    inviterId: string;
    inviterName: string;
    inviteeId: string;
    inviteeName?: string;
    roleTitle?: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (params.inviterId === params.inviteeId) {
      return { success: false, error: "You cannot invite yourself to your own squad." };
    }

    const roleTitle = params.roleTitle || "Squad Member";
    const teamName = params.teamName || "Project Squad";
    const proj = MOCK_PROJECTS.find((p) => p.id === params.projectId);
    const projectName = params.projectName || proj?.title || "Hackathon Project";

    const inviteRecord: TeamInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: params.teamId,
      teamName,
      projectId: params.projectId,
      projectName,
      inviterId: params.inviterId,
      inviterName: params.inviterName,
      inviteeId: params.inviteeId,
      roleTitle,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const projUuid = toProjectUuid(params.projectId);
        let effectiveTeamId = params.teamId;

        // If teamId is not a valid UUID format, look up the team for this project or create one
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveTeamId);
        if (!isUuid) {
          const { data: existingTeam } = await supabase
            .from("teams")
            .select("id")
            .eq("project_id", projUuid)
            .maybeSingle();

          if (existingTeam?.id) {
            effectiveTeamId = existingTeam.id;
          } else {
            const { data: createdTeam } = await supabase
              .from("teams")
              .insert({
                project_id: projUuid,
                name: teamName,
                team_compatibility_score: 90,
              })
              .select("id")
              .maybeSingle();

            if (createdTeam?.id) {
              effectiveTeamId = createdTeam.id;
              await supabase.from("team_members").insert({
                team_id: createdTeam.id,
                user_id: params.inviterId,
                role_title: "Squad Lead",
                is_lead: true,
              });
            }
          }
        }

        // Check if an invitation already exists
        const { data: existing, error: queryError } = await supabase
          .from("team_invitations")
          .select("id, status")
          .eq("team_id", effectiveTeamId)
          .eq("invitee_id", params.inviteeId)
          .maybeSingle();

        if (queryError) {
          console.error("Supabase team_invitations query error:", queryError);
        }

        if (existing) {
          if (existing.status === "pending") {
            return { success: false, error: "An invitation is already pending for this student." };
          }
          if (existing.status === "accepted") {
            return { success: false, error: "Student is already a member of this squad." };
          }
        }

        const { error: insertError } = await supabase
          .from("team_invitations")
          .insert({
            team_id: effectiveTeamId,
            project_id: projUuid,
            inviter_id: params.inviterId,
            invitee_id: params.inviteeId,
            role_title: roleTitle,
            status: "pending",
          });

        if (insertError) {
          console.error("Supabase team_invitations insert error:", insertError);
          return { success: false, error: "Couldn't send invitation right now, please try again." };
        }
      } catch (err) {
        console.error("InvitationService.sendInvitation exception:", err);
        return { success: false, error: "Couldn't send invitation right now, please try again." };
      }
    }

    // Save in local cache
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_INVITES_KEY);
        let list: TeamInvitation[] = stored ? JSON.parse(stored) : [];
        if (!list.some((i) => i.teamId === params.teamId && i.inviteeId === params.inviteeId)) {
          list.push(inviteRecord);
          localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(list));
        }
      } catch (err) {
        console.error("InvitationService.sendInvitation (local cache) failed:", err);
      }
    }

    // Send notification to invitee
    await NotificationService.createNotification({
      userId: params.inviteeId,
      title: "New Squad Invitation",
      message: `${params.inviterName} invited you to join "${teamName}" as ${roleTitle}.`,
      type: "invitation",
      link: "/teams",
    });

    return { success: true };
  }

  /**
   * Retrieves all invitations received by the current student
   */
  static async getMyInvitations(userId?: string): Promise<TeamInvitation[]> {
    if (!userId) return [];

    let localInvites: TeamInvitation[] = [];
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      if (stored) {
        try {
          localInvites = JSON.parse(stored).filter((i: TeamInvitation) => i.inviteeId === userId);
        } catch (err) {
          console.error("InvitationService.getMyInvitations (local parse) failed:", err);
          localInvites = [];
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("team_invitations")
          .select(`
            id,
            team_id,
            project_id,
            inviter_id,
            invitee_id,
            role_title,
            status,
            created_at,
            teams ( id, name ),
            projects ( id, title ),
            profiles!team_invitations_inviter_id_fkey ( full_name )
          `)
          .eq("invitee_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("InvitationService.getMyInvitations query error:", error);
        } else if (data) {
          const dbInvites: TeamInvitation[] = (data as unknown as TeamInvitationQueryResult[]).map((inv) => ({
            id: inv.id,
            teamId: inv.team_id,
            teamName: inv.teams?.name || "Squad",
            projectId: inv.project_id,
            projectName: inv.projects?.title || "Project",
            inviterId: inv.inviter_id,
            inviterName: inv.profiles?.full_name || "Squad Lead",
            inviteeId: inv.invitee_id,
            roleTitle: inv.role_title,
            status: inv.status,
            createdAt: inv.created_at,
          }));

          const dbIds = new Set(dbInvites.map((i) => i.id));
          const remainingLocal = localInvites.filter((i) => !dbIds.has(i.id));
          return [...dbInvites, ...remainingLocal];
        }
      } catch (err) {
        console.error("InvitationService.getMyInvitations exception:", err);
      }
    }

    return localInvites;
  }

  /**
   * Respond to an invitation (accept or decline)
   */
  static async respondToInvitation(
    invitationId: string,
    action: "accepted" | "declined",
    userId: string,
    userName?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();

        // 1. Get invitation details
        const { data: invData, error: fetchErr } = await supabase
          .from("team_invitations")
          .select("*, teams(name)")
          .eq("id", invitationId)
          .maybeSingle();

        if (fetchErr || !invData) {
          console.error("InvitationService.respondToInvitation fetch error:", fetchErr);
          return { success: false, error: "Invitation not found." };
        }

        // 2. Update status
        const { error: updateErr } = await supabase
          .from("team_invitations")
          .update({ status: action })
          .eq("id", invitationId);

        if (updateErr) {
          console.error("InvitationService.respondToInvitation update error:", updateErr);
          return { success: false, error: updateErr.message };
        }

        // 3. If accepted, insert into team_members
        if (action === "accepted") {
          const { error: memberInsertErr } = await supabase.from("team_members").insert({
            team_id: invData.team_id,
            user_id: userId,
            role_title: invData.role_title || "Member",
            is_lead: false,
          });

          if (memberInsertErr) {
            console.error("InvitationService.respondToInvitation member insert error:", memberInsertErr);
          }

          // Notify squad lead
          await NotificationService.createNotification({
            userId: invData.inviter_id,
            title: "Invitation Accepted",
            message: `${userName || "A student"} accepted your invitation to join ${invData.teams?.name || "the squad"}!`,
            type: "application_status",
            link: "/teams",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("InvitationService.respondToInvitation exception:", err);
        return { success: false, error: msg || "Failed to process invitation." };
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      if (stored) {
        try {
          const list: TeamInvitation[] = JSON.parse(stored);
          const updated = list.map((i) =>
            i.id === invitationId ? { ...i, status: action } : i
          );
          localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error("InvitationService.respondToInvitation (local update) failed:", err);
        }
      }
    }

    return { success: true };
  }
}
