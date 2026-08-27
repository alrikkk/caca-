import { describe, it, expect, beforeEach } from "vitest";
import { ChatService } from "@/services/chat-service";
import { NotificationService } from "@/services/notification-service";
import { InvitationService } from "@/services/invitation-service";
import { ApplicationService } from "@/services/application-service";
import { SocialService } from "@/services/social-service";
import { MOCK_STUDENTS, CURRENT_USER } from "@/lib/mock-data";

describe("Identity & User-Scoping Verification Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("1 & 2. Chat Participant Identity & Resolution", () => {
    it("should resolve real participant name from participant ID in conversations", async () => {
      const alexId = CURRENT_USER.id; // usr_curr_01
      const conversations = await ChatService.getConversations(alexId);

      expect(conversations.length).toBeGreaterThan(0);

      // conv_01 is with Maya Patel (usr_02)
      const convWithMaya = conversations.find((c) => c.id === "conv_01");
      expect(convWithMaya).toBeDefined();
      expect(convWithMaya?.name).toBe("Maya Patel");

      // conv_02 is with Marcus Vance (usr_03)
      const convWithMarcus = conversations.find((c) => c.id === "conv_02");
      expect(convWithMarcus).toBeDefined();
      expect(convWithMarcus?.name).toBe("Marcus Vance");
    });

    it("should resolve participant name dynamically when viewed from the other user's perspective", async () => {
      const mayaId = "usr_02";
      // When Maya opens her conversations, conv_01 should show Alex Chen (the other participant)
      const mayaConvs = await ChatService.getConversations(mayaId);
      const convWithAlex = mayaConvs.find((c) => c.id === "conv_01");
      expect(convWithAlex).toBeDefined();
      expect(convWithAlex?.name).toBe("Alex Chen");
    });

    it("should attach proper participant user profile metadata to 1-on-1 conversations", async () => {
      const convs = await ChatService.getConversations(CURRENT_USER.id);
      const conv01 = convs.find((c) => c.id === "conv_01");
      const mayaMember = conv01?.members.find((m) => m.userId === "usr_02");

      expect(mayaMember).toBeDefined();
      expect(mayaMember?.user?.fullName).toBe("Maya Patel");
      expect(mayaMember?.user?.avatarUrl).toBeDefined();
    });
  });

  describe("3. Message Sender Identity Resolution", () => {
    it("should resolve sender profiles for messages", async () => {
      const msgs = await ChatService.getMessages("conv_01");
      expect(msgs.length).toBeGreaterThan(0);

      const firstMsg = msgs[0];
      expect(firstMsg.senderId).toBe("usr_02");

      const senderStudent = MOCK_STUDENTS.find((s) => s.id === firstMsg.senderId);
      expect(senderStudent?.fullName).toBe("Maya Patel");
    });
  });

  describe("4 & 5. User-Scoped Notifications & Read/Unread State Isolation", () => {
    it("should filter notifications strictly by recipient userId", async () => {
      const alexNotifs = await NotificationService.getNotifications(CURRENT_USER.id);
      expect(alexNotifs.every((n) => n.userId === CURRENT_USER.id)).toBe(true);

      const mayaNotifs = await NotificationService.getNotifications("usr_02");
      expect(mayaNotifs.every((n) => n.userId === "usr_02")).toBe(true);

      // Notifications should not cross contaminate
      const alexIds = new Set(alexNotifs.map((n) => n.id));
      const mayaIds = new Set(mayaNotifs.map((n) => n.id));
      Array.from(alexIds).forEach((id) => {
        expect(mayaIds.has(id)).toBe(false);
      });
    });

    it("should isolate markAllAsRead so one user's action does not affect another user's unread notifications", async () => {
      // Alex has unread notifications
      const alexBefore = await NotificationService.getNotifications(CURRENT_USER.id);
      expect(alexBefore.some((n) => !n.read)).toBe(true);

      // Maya has unread notifications
      const mayaBefore = await NotificationService.getNotifications("usr_02");
      expect(mayaBefore.some((n) => !n.read)).toBe(true);

      // Alex marks all read
      await NotificationService.markAllAsRead(CURRENT_USER.id);

      const alexAfter = await NotificationService.getNotifications(CURRENT_USER.id);
      expect(alexAfter.every((n) => n.read)).toBe(true);

      // Maya's unread status must remain unchanged!
      const mayaAfter = await NotificationService.getNotifications("usr_02");
      expect(mayaAfter.some((n) => !n.read)).toBe(true);
    });
  });

  describe("6. Invitation Notification Flow (Targeted Recipient)", () => {
    it("should create an invitation notification for the invitee only", async () => {
      const inviterId = CURRENT_USER.id; // Alex
      const inviteeId = "usr_04"; // Elena Rostova

      const res = await InvitationService.sendInvitation({
        teamId: "team_1",
        teamName: "EchoSpatial Core",
        projectId: "proj_1",
        projectName: "EchoSpatial",
        inviterId,
        inviterName: "Alex Chen",
        inviteeId,
        inviteeName: "Elena Rostova",
        roleTitle: "Lead UX Designer",
      });

      expect(res.success).toBe(true);

      // Invitee Elena should see the notification
      const elenaNotifs = await NotificationService.getNotifications(inviteeId);
      const invNotif = elenaNotifs.find((n) => n.type === "invitation");
      expect(invNotif).toBeDefined();
      expect(invNotif?.userId).toBe(inviteeId);
      expect(invNotif?.message).toContain("Alex Chen invited you");

      // Inviter Alex should NOT see the invitation notification addressed to him
      const alexNotifs = await NotificationService.getNotifications(inviterId);
      expect(alexNotifs.some((n) => n.id === invNotif?.id)).toBe(false);
    });
  });

  describe("7. Project Application Notification Flow (Targeted Recipient)", () => {
    it("should notify the project owner when an applicant applies", async () => {
      const applicantId = CURRENT_USER.id; // Alex
      const projectId = "proj_01"; // EchoSpatial owned by Maya Patel (usr_02)
      const ownerId = "usr_02"; // Maya

      const res = await ApplicationService.applyToProject(projectId, applicantId, 95, "Excited to join!");
      expect(res.success).toBe(true);

      // Maya Patel (owner) should receive notification
      const ownerNotifs = await NotificationService.getNotifications(ownerId);
      const appNotif = ownerNotifs.find((n) => n.actorId === applicantId && n.title === "New Project Application");
      expect(appNotif).toBeDefined();
      expect(appNotif?.userId).toBe(ownerId);
      expect(appNotif?.message).toContain("Alex Chen applied");

      // Alex (applicant) should NOT see the owner's notification
      const alexNotifs = await NotificationService.getNotifications(applicantId);
      expect(alexNotifs.some((n) => n.id === appNotif?.id)).toBe(false);
    });
  });

  describe("8. Follow & Connect Notifications (Targeted Recipient)", () => {
    it("should notify target user when followed", async () => {
      const followerId = "usr_03"; // Marcus
      const targetId = "usr_04"; // Elena

      await SocialService.followUser(followerId, targetId, true);

      // Elena should receive notification
      const elenaNotifs = await NotificationService.getNotifications(targetId);
      const followNotif = elenaNotifs.find((n) => n.type === "follow");
      expect(followNotif).toBeDefined();
      expect(followNotif?.userId).toBe(targetId);
      expect(followNotif?.message).toContain("Marcus Vance started following you");

      // Marcus should NOT receive this notification
      const marcusNotifs = await NotificationService.getNotifications(followerId);
      expect(marcusNotifs.some((n) => n.id === followNotif?.id)).toBe(false);
    });

    it("should notify target user when connected", async () => {
      const userA = "usr_04"; // Elena
      const userB = "usr_05"; // Zack

      await SocialService.connectUser(userA, userB, true);

      // Zack should receive notification
      const zackNotifs = await NotificationService.getNotifications(userB);
      const connNotif = zackNotifs.find((n) => n.type === "connect");
      expect(connNotif).toBeDefined();
      expect(connNotif?.userId).toBe(userB);
      expect(connNotif?.message).toContain("Elena Rostova connected with you");

      // Elena should NOT receive this notification
      const elenaNotifs = await NotificationService.getNotifications(userA);
      expect(elenaNotifs.some((n) => n.id === connNotif?.id)).toBe(false);
    });
  });
});
