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

        // Check if an invitation already exists
        const { data: existing } = await supabase
          .from("team_invitations")
          .select("id, status")
          .eq("team_id", params.teamId)
          .eq("invitee_id", params.inviteeId)
          .maybeSingle();

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
            team_id: params.teamId,
            project_id: projUuid,
            inviter_id: params.inviterId,
            invitee_id: params.inviteeId,
            role_title: roleTitle,
            status: "pending",
          });

        if (insertError) {
          console.error("Supabase team_invitations insert error:", insertError);
          return { success: false, error: insertError.message };
        }
      } catch (err: any) {
        console.error("sendInvitation exception:", err);
        return { success: false, error: err?.message || "Failed to send invitation." };
      }
    }

    // Save in local cache
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_INVITES_KEY);
      let list: TeamInvitation[] = stored ? JSON.parse(stored) : [];
      if (!list.some((i) => i.teamId === params.teamId && i.inviteeId === params.inviteeId)) {
        list.push(inviteRecord);
        localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(list));
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
        } catch {
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

        if (!error && data) {
          const dbInvites: TeamInvitation[] = data.map((inv: any) => ({
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
        console.error("getMyInvitations error:", err);
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
          return { success: false, error: "Invitation not found." };
        }

        // 2. Update status
        const { error: updateErr } = await supabase
          .from("team_invitations")
          .update({ status: action })
          .eq("id", invitationId);

        if (updateErr) {
          return { success: false, error: updateErr.message };
        }

        // 3. If accepted, insert into team_members
        if (action === "accepted") {
          await supabase.from("team_members").insert({
            team_id: invData.team_id,
            user_id: userId,
            role_title: invData.role_title || "Member",
            is_lead: false,
          });

          // Notify squad lead
          await NotificationService.createNotification({
            userId: invData.inviter_id,
            title: "Invitation Accepted",
            message: `${userName || "A student"} accepted your invitation to join ${invData.teams?.name || "the squad"}!`,
            type: "application_status",
            link: "/teams",
          });
        }
      } catch (err: any) {
        console.error("respondToInvitation exception:", err);
        return { success: false, error: err?.message || "Failed to process invitation." };
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
        } catch {}
      }
    }

    return { success: true };
  }
}
