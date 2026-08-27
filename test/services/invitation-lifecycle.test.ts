import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvitationService } from "@/services/invitation-service";
import { NotificationService } from "@/services/notification-service";
import * as supabaseClient from "@/lib/supabase/client";

describe("Phase 4 - Team Invitation Lifecycle & In-App Notifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("prevents self-invitations to squads", async () => {
    const res = await InvitationService.sendInvitation({
      teamId: "team_test_123",
      projectId: "proj_01",
      inviterId: "usr_same",
      inviterName: "Lead",
      inviteeId: "usr_same",
      roleTitle: "Developer",
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe("You cannot invite yourself to your own squad.");
  });

  it("successfully creates an invitation and in-app notification in local storage mode", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(false);

    const res = await InvitationService.sendInvitation({
      teamId: "team_local_1",
      teamName: "EchoSpatial Squad",
      projectId: "proj_01",
      projectName: "EchoSpatial",
      inviterId: "usr_lead_01",
      inviterName: "Alex Chen",
      inviteeId: "usr_cand_02",
      inviteeName: "Maya Patel",
      roleTitle: "ML Specialist",
    });

    expect(res.success).toBe(true);

    // Verify invitation is retrievable by invitee
    const invites = await InvitationService.getMyInvitations("usr_cand_02");
    expect(invites.length).toBe(1);
    expect(invites[0].teamName).toBe("EchoSpatial Squad");
    expect(invites[0].roleTitle).toBe("ML Specialist");
    expect(invites[0].status).toBe("pending");

    // Verify in-app notification was dispatched to invitee
    const notifs = await NotificationService.getNotifications("usr_cand_02");
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toBe("New Squad Invitation");
    expect(notifs[0].message).toContain("Alex Chen");
  });

  it("updates invitation status upon accepting and creates squad lead notification", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(false);

    await InvitationService.sendInvitation({
      teamId: "team_local_1",
      teamName: "EchoSpatial Squad",
      projectId: "proj_01",
      projectName: "EchoSpatial",
      inviterId: "usr_lead_01",
      inviterName: "Alex Chen",
      inviteeId: "usr_cand_02",
      inviteeName: "Maya Patel",
      roleTitle: "ML Specialist",
    });

    const invites = await InvitationService.getMyInvitations("usr_cand_02");
    const inviteId = invites[0].id;

    // Accept invitation
    const acceptRes = await InvitationService.respondToInvitation(
      inviteId,
      "accepted",
      "usr_cand_02",
      "Maya Patel"
    );

    expect(acceptRes.success).toBe(true);

    // Verify status updated in local storage
    const updatedInvites = await InvitationService.getMyInvitations("usr_cand_02");
    expect(updatedInvites[0].status).toBe("accepted");
  });

  it("updates invitation status upon declining", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(false);

    await InvitationService.sendInvitation({
      teamId: "team_local_1",
      teamName: "EchoSpatial Squad",
      projectId: "proj_01",
      projectName: "EchoSpatial",
      inviterId: "usr_lead_01",
      inviterName: "Alex Chen",
      inviteeId: "usr_cand_02",
      inviteeName: "Maya Patel",
      roleTitle: "ML Specialist",
    });

    const invites = await InvitationService.getMyInvitations("usr_cand_02");
    const inviteId = invites[0].id;

    // Decline invitation
    const declineRes = await InvitationService.respondToInvitation(
      inviteId,
      "declined",
      "usr_cand_02",
      "Maya Patel"
    );

    expect(declineRes.success).toBe(true);

    const updatedInvites = await InvitationService.getMyInvitations("usr_cand_02");
    expect(updatedInvites[0].status).toBe("declined");
  });
});
