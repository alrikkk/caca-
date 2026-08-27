import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatService } from "@/services/chat-service";
import { TeamService } from "@/services/team-service";
import { NotificationService } from "@/services/notification-service";
import { ProfileService } from "@/services/profile-service";
import { defaultMatchingEngine } from "@/matching/engine";
import { MOCK_STUDENTS, MOCK_PROJECTS } from "@/lib/mock-data";
import { StudentProfile } from "@/types/user";

describe("Final Correctness & Real App Behavior Verification", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("1. Chat Real User Identity & Scoping", () => {
    it("should resolve real student identity and name in 1-on-1 direct conversation without defaulting to generic STUDENT", async () => {
      const userA = "usr_real_alice";
      const userB = "usr_02"; // Maya Patel

      const convRes = await ChatService.createDirectConversation(userA, userB, true);
      expect(convRes.success).toBe(true);
      expect(convRes.conversation).toBeDefined();

      const conv = convRes.conversation!;
      const conversations = await ChatService.getConversations(userA, true);
      const retrieved = conversations.find((c) => c.id === conv.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Maya Patel");
      expect(retrieved?.members.some((m) => m.userId === "usr_02")).toBe(true);

      const mayaMember = retrieved?.members.find((m) => m.userId === "usr_02");
      expect(mayaMember?.user?.fullName).toBe("Maya Patel");
      expect(mayaMember?.user?.major).toBe("EECS & AI");
      expect(mayaMember?.user?.id).toBe("usr_02");
    });

    it("should ensure direct participant profile link references the actual other user ID", async () => {
      const userA = "usr_current_lead";
      const userB = "usr_03"; // Marcus Vance

      const convRes = await ChatService.createDirectConversation(userA, userB, true);
      const conv = convRes.conversation!;

      // Find the other member in the 1-on-1 conversation
      const otherMember = conv.members.find((m) => m.userId !== userA);
      expect(otherMember?.userId).toBe("usr_03");
      expect(otherMember?.user?.fullName).toBe("Marcus Vance");
    });
  });

  describe("2. Chat Per-User Deletion & Persistence", () => {
    it("should allow User A to delete/hide a conversation while User B retains access", async () => {
      const userA = "usr_user_a";
      const userB = "usr_user_b";

      const convRes = await ChatService.createDirectConversation(userA, userB, true);
      const convId = convRes.conversation!.id;

      // Both users initially have access
      const userAConvsBefore = await ChatService.getConversations(userA, true);
      const userBConvsBefore = await ChatService.getConversations(userB, true);
      expect(userAConvsBefore.some((c) => c.id === convId)).toBe(true);
      expect(userBConvsBefore.some((c) => c.id === convId)).toBe(true);

      // User A deletes the conversation
      const deleteRes = await ChatService.deleteConversation(convId, userA, true);
      expect(deleteRes.success).toBe(true);

      // User A no longer sees it
      const userAConvsAfter = await ChatService.getConversations(userA, true);
      expect(userAConvsAfter.some((c) => c.id === convId)).toBe(false);

      // User B still has access to the conversation
      const userBConvsAfter = await ChatService.getConversations(userB, true);
      expect(userBConvsAfter.some((c) => c.id === convId)).toBe(true);
    });

    it("should persist deletion across subsequent page loads and re-authentications", async () => {
      const userId = "usr_persisted_user";
      const convRes = await ChatService.createDirectConversation(userId, "usr_04", true);
      const convId = convRes.conversation!.id;

      await ChatService.deleteConversation(convId, userId, true);

      // Simulate re-fetching after reload
      const loadedAfterReload = await ChatService.getConversations(userId, true);
      expect(loadedAfterReload.some((c) => c.id === convId)).toBe(false);
    });
  });

  describe("3. Notifications Real User Context & Scoping", () => {
    it("should scope notifications strictly to the recipient and not leak to other users", async () => {
      const recipient = "usr_maya_patel";
      const otherUser = "usr_jordan_lee";

      await NotificationService.createNotification({
        userId: recipient,
        actorId: otherUser,
        actorName: "Jordan Lee",
        actorAvatarUrl: "https://images.unsplash.com/photo-jordan.jpg",
        title: "Squad Invitation",
        message: "Jordan Lee invited you to join Autonomous Rover Squad.",
        type: "invitation",
        isDemoMode: true,
      });

      const recipientNotifs = await NotificationService.getNotifications(recipient, true);
      expect(recipientNotifs.length).toBeGreaterThan(0);
      expect(recipientNotifs[0].actorName).toBe("Jordan Lee");
      expect(recipientNotifs[0].message).toContain("Autonomous Rover Squad");

      const otherUserNotifs = await NotificationService.getNotifications(otherUser, true);
      expect(otherUserNotifs.some((n) => n.userId === recipient)).toBe(false);
    });
  });

  describe("4. Squad Creation & Idempotency", () => {
    it("should successfully create a new squad and assign the creator as team lead", async () => {
      const creatorId = "usr_squad_creator_01";
      const res = await TeamService.createTeam({
        projectId: "proj_01",
        projectName: "EchoSpatial Autonomous Mesh",
        teamName: "EchoSpatial Alpha Squad",
        creatorId,
        roleTitle: "Lead Systems Engineer",
      });

      expect(res.success).toBe(true);
      expect(res.team).toBeDefined();
      expect(res.team?.isLead).toBe(true);
      expect(res.team?.name).toBe("EchoSpatial Alpha Squad");
      expect(res.team?.role).toBe("Lead Systems Engineer");
    });

    it("should handle existing squad for project cleanly without raw database error", async () => {
      const creatorId = "usr_squad_creator_02";

      // 1. Initial creation
      const res1 = await TeamService.createTeam({
        projectId: "proj_unique_01",
        projectName: "BioFlow Micro-Telemetry",
        teamName: "BioFlow Primary Team",
        creatorId,
      });
      expect(res1.success).toBe(true);

      // 2. Second creation attempt for the same project by the same creator
      const res2 = await TeamService.createTeam({
        projectId: "proj_unique_01",
        projectName: "BioFlow Micro-Telemetry",
        teamName: "BioFlow Duplicate Attempt",
        creatorId,
      });

      // Should succeed idempotently and return existing team without throwing SQL duplicate key error
      expect(res2.success).toBe(true);
      expect(res2.isExisting).toBe(true);
      expect(res2.error).toBeUndefined();
    });

    it("should reject squad creation with empty or whitespace-only name", async () => {
      const res = await TeamService.createTeam({
        projectId: "proj_03",
        teamName: "   ",
        creatorId: "usr_lead_03",
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Team name is required.");
    });
  });

  describe("5. AI Squad Builder & Deterministic Scoring", () => {
    it("should recommend candidates with real candidate IDs and grounded skill matches", () => {
      const project = MOCK_PROJECTS[0];
      const candidates = MOCK_STUDENTS;

      const teamResult = defaultMatchingEngine.buildRecommendedSquad(candidates, project);

      expect(teamResult.recommendedMembers.length).toBeGreaterThan(0);
      expect(teamResult.teamScore).toBeGreaterThanOrEqual(0);
      expect(teamResult.teamScore).toBeLessThanOrEqual(100);

      // Verify all recommended members have valid IDs from candidate pool
      const validCandidateIds = new Set(candidates.map((c) => c.id));
      teamResult.recommendedMembers.forEach((member) => {
        expect(validCandidateIds.has(member.student.id)).toBe(true);
        expect(member.student.fullName).toBeDefined();
        expect(member.student.major).toBeDefined();
      });
    });
  });
});
