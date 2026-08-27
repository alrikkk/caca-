import { describe, it, expect, beforeEach, vi } from "vitest";
import { SocialService } from "@/services/social-service";
import { ClipService } from "@/services/clip-service";
import { ChatService } from "@/services/chat-service";
import { ProfileService } from "@/services/profile-service";
import { TeamService } from "@/services/team-service";

describe("Phase 9 Final Feature Pack Service Suite", () => {
  beforeEach(() => {
    // Clear localStorage mock before each test
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("SocialService", () => {
    it("should prevent a user from following themselves", async () => {
      const res = await SocialService.followUser("usr_01", "usr_01", true);
      expect(res.success).toBe(false);
      expect(res.error).toContain("cannot follow yourself");
    });

    it("should follow and unfollow target users", async () => {
      const follower = "usr_01";
      const target = "usr_02";

      expect(SocialService.isFollowing(follower, target)).toBe(false);

      const followRes = await SocialService.followUser(follower, target, true);
      expect(followRes.success).toBe(true);
      expect(SocialService.isFollowing(follower, target)).toBe(true);

      const unfollowRes = await SocialService.unfollowUser(follower, target, true);
      expect(unfollowRes.success).toBe(true);
      expect(SocialService.isFollowing(follower, target)).toBe(false);
    });

    it("should return realistic follower counts", async () => {
      const counts = await SocialService.getFollowCounts("usr_01");
      expect(counts.followersCount).toBeGreaterThan(0);
      expect(typeof counts.followingCount).toBe("number");
    });

    it("should connect and disconnect target users separately from follows", async () => {
      const userA = "usr_01";
      const userB = "usr_02";

      expect(SocialService.isConnected(userA, userB)).toBe(false);

      const connRes = await SocialService.connectUser(userA, userB, true);
      expect(connRes.success).toBe(true);
      expect(SocialService.isConnected(userA, userB)).toBe(true);

      const disconnRes = await SocialService.disconnectUser(userA, userB, true);
      expect(disconnRes.success).toBe(true);
      expect(SocialService.isConnected(userA, userB)).toBe(false);
    });
  });

  describe("ClipService", () => {
    it("should fetch default mock clips", async () => {
      const clips = await ClipService.getClips("usr_01");
      expect(clips.length).toBeGreaterThan(0);
      expect(clips[0]).toHaveProperty("videoUrl");
      expect(clips[0]).toHaveProperty("caption");
    });

    it("should toggle likes on clips", async () => {
      const clipId = "clip_01";
      const userId = "usr_01";

      const likeRes = await ClipService.toggleLikeClip(clipId, userId, true);
      expect(likeRes.success).toBe(true);
      expect(likeRes.isLiked).toBe(true);

      const unlikeRes = await ClipService.toggleLikeClip(clipId, userId, true);
      expect(unlikeRes.success).toBe(true);
      expect(unlikeRes.isLiked).toBe(false);
    });

    it("should create a new clip and store it", async () => {
      const created = await ClipService.createClip(
        {
          creatorId: "usr_01",
          caption: "Building an autonomous rover demo!",
          videoUrl: "https://example.com/demo.mp4",
          tags: ["Robotics", "ROS2"],
        },
        true
      );

      expect(created.success).toBe(true);
      expect(created.clip?.caption).toBe("Building an autonomous rover demo!");

      const all = await ClipService.getClips("usr_01");
      expect(all.some((c) => c.caption.includes("autonomous rover"))).toBe(true);
    });
  });

  describe("ChatService", () => {
    it("should return initial conversations", async () => {
      const convs = await ChatService.getConversations("usr_01");
      expect(convs.length).toBeGreaterThan(0);
    });

    it("should send and fetch messages in a conversation", async () => {
      const convId = "conv_mock_01";
      const senderId = "usr_01";
      const content = "Hey team, sprint demo is tomorrow!";

      const sendRes = await ChatService.sendMessage(convId, senderId, content, true);
      expect(sendRes.success).toBe(true);
      expect(sendRes.message?.content).toBe(content);

      const msgs = await ChatService.getMessages(convId);
      expect(msgs.some((m) => m.content === content)).toBe(true);
    });

    it("should create direct conversation between two students", async () => {
      const res = await ChatService.createDirectConversation("usr_01", "usr_03", true);
      expect(res.success).toBe(true);
      expect(res.conversation?.isGroup).toBe(false);
    });

    it("should create a group squad conversation", async () => {
      const res = await ChatService.createGroupConversation(
        "usr_01",
        "Autonomous Flight Hackers",
        ["usr_02", "usr_03"],
        true
      );
      expect(res.success).toBe(true);
      expect(res.conversation?.name).toBe("Autonomous Flight Hackers");
      expect(res.conversation?.isGroup).toBe(true);
      expect(res.conversation?.members.length).toBe(3);
    });
  });

  describe("ProfileService Resume Management", () => {
    it("should reject non-PDF files for resume upload", async () => {
      const fakeImage = new File(["dummy image"], "avatar.png", { type: "image/png" });
      const res = await ProfileService.uploadResume("usr_01", fakeImage, true);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Only PDF");
    });

    it("should accept valid PDF files for resume upload", async () => {
      // Mock createObjectURL
      global.URL.createObjectURL = vi.fn(() => "blob:https://caca.app/resume_uuid.pdf");

      const fakePdf = new File(["%PDF-1.4..."], "alex_chen_resume.pdf", {
        type: "application/pdf",
      });
      const res = await ProfileService.uploadResume("usr_01", fakePdf, true);
      expect(res.success).toBe(true);
      expect(res.url).toBeDefined();

      const removeRes = await ProfileService.removeResume("usr_01", true);
      expect(removeRes.success).toBe(true);
    });
  });

  describe("TeamService Deletion", () => {
    it("should allow squad deletion locally", async () => {
      const deleteRes = await TeamService.deleteTeam({
        teamId: "team_mock_1",
        requesterId: "usr_01",
      });
      expect(deleteRes.success).toBe(true);
    });
  });
});
