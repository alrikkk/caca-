import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProfileService, OnboardingData } from "@/services/profile-service";
import { ChatService } from "@/services/chat-service";
import { StudentProfile } from "@/types/user";

describe("Profile Persistence & Chat Deletion Verification Suite", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("1. Profile Creation & Onboarding Persistence", () => {
    it("should include all identity, education, skills, and availability fields in the onboarding payload", async () => {
      const data: OnboardingData = {
        fullName: "Jordan Lee",
        college: "MIT",
        major: "Robotics & AI",
        gradYear: 2026,
        experienceLevel: "junior",
        workingStyle: "collaborative",
        bio: "Specializing in autonomous navigation systems.",
        phoneNumber: "+15550192834",
        avatarUrl: "https://images.unsplash.com/photo-jordan.jpg",
        githubUrl: "https://github.com/jordanlee",
        portfolioUrl: "https://jordanlee.dev",
        linkedinUrl: "https://linkedin.com/in/jordanlee",
        discordUrl: "jordan#1234",
        instagramUrl: "jordan_ai",
        hoursPerWeek: 15,
        skills: [
          { name: "ROS2", category: "robotics", proficiency: 5 },
          { name: "PyTorch", category: "ml_ai", proficiency: 4 },
          { name: "C++", category: "backend", proficiency: 4 },
        ],
        openTo: ["HACKATHONS", "RESEARCH"],
        availabilityStatus: "AVAILABLE",
      };

      const profile = await ProfileService.completeOnboarding("usr_jordan_01", "jordan@mit.edu", data);

      expect(profile.fullName).toBe("Jordan Lee");
      expect(profile.college).toBe("MIT");
      expect(profile.major).toBe("Robotics & AI");
      expect(profile.gradYear).toBe(2026);
      expect(profile.skills.length).toBe(3);
      expect(profile.skills[0].name).toBe("ROS2");
      expect(profile.skills[0].proficiency).toBe(5);
      expect(profile.availability.hoursPerWeek).toBe(15);
      expect(profile.avatarUrl).toBe("https://images.unsplash.com/photo-jordan.jpg");
    });
  });

  describe("2 & 3. Profile Updates & Relational Skills Sync", () => {
    it("should update profile fields and sync skill additions, updates, and removals", async () => {
      const initialProfile: StudentProfile = {
        id: "usr_test_01",
        email: "test@campus.edu",
        fullName: "Test User",
        college: "Stanford",
        major: "CS",
        gradYear: 2025,
        experienceLevel: "senior",
        workingStyle: "structured",
        skills: [
          { id: "sk_1", name: "TypeScript", category: "frontend", proficiency: 3, yearsExperience: 2 },
          { id: "sk_2", name: "Python", category: "backend", proficiency: 4, yearsExperience: 3 },
        ],
        interests: [],
        availability: {
          hoursPerWeek: 10,
          timezone: "EST",
          prefersRemote: true,
          weekendAvailability: true,
          weekdayEvenings: true,
        },
      };

      // 1. Initial save
      await ProfileService.updateProfile(initialProfile, true);
      const loaded1 = await ProfileService.getCurrentProfile();
      expect(loaded1?.skills.length).toBe(2);
      expect(loaded1?.skills.find((s) => s.name === "TypeScript")?.proficiency).toBe(3);

      // 2. Edit profile: Change proficiency of TypeScript to 5, remove Python, add Rust
      const updatedProfile: StudentProfile = {
        ...initialProfile,
        skills: [
          { id: "sk_1", name: "TypeScript", category: "frontend", proficiency: 5, yearsExperience: 2 },
          { id: "sk_3", name: "Rust", category: "backend", proficiency: 4, yearsExperience: 1 },
        ],
        bio: "Updated bio for robotics.",
        availability: {
          ...initialProfile.availability,
          hoursPerWeek: 18,
        },
      };

      await ProfileService.updateProfile(updatedProfile, true);
      const loaded2 = await ProfileService.getCurrentProfile();

      expect(loaded2?.bio).toBe("Updated bio for robotics.");
      expect(loaded2?.skills.length).toBe(2);
      expect(loaded2?.skills.find((s) => s.name === "TypeScript")?.proficiency).toBe(5);
      expect(loaded2?.skills.find((s) => s.name === "Rust")).toBeDefined();
      expect(loaded2?.skills.find((s) => s.name === "Python")).toBeUndefined();
    });
  });

  describe("4. Avatar & Resume Persistence", () => {
    it("should persist uploaded avatar references across sessions", async () => {
      const fakeImage = new File(["fake_image_bytes"], "avatar.png", { type: "image/png" });
      const res = await ProfileService.uploadAndSaveAvatar("usr_avatar_01", fakeImage, true);

      expect(res.url).toBeDefined();

      const profile = await ProfileService.getCurrentProfile();
      expect(profile?.avatarUrl).toBe(res.url);

      // Remove avatar
      await ProfileService.removeAvatar("usr_avatar_01", true);
      const removedProfile = await ProfileService.getCurrentProfile();
      expect(removedProfile?.avatarUrl).toBeUndefined();
    });

    it("should persist uploaded PDF resume references across sessions", async () => {
      global.URL.createObjectURL = vi.fn(() => "blob:https://caca.app/resume_test.pdf");

      const fakePdf = new File(["%PDF-1.4..."], "resume.pdf", { type: "application/pdf" });
      const res = await ProfileService.uploadResume("usr_resume_01", fakePdf, true);

      expect(res.success).toBe(true);
      expect(res.url).toBeDefined();

      const profile = await ProfileService.getCurrentProfile();
      expect(profile?.resumeUrl).toBe(res.url);

      // Remove resume
      await ProfileService.removeResume("usr_resume_01", true);
      const removedProfile = await ProfileService.getCurrentProfile();
      expect(removedProfile?.resumeUrl).toBeUndefined();
    });
  });

  describe("5. Multi-User Profile Isolation", () => {
    it("should ensure User A and User B maintain completely isolated profile datasets", async () => {
      const userA: StudentProfile = {
        id: "usr_alice",
        email: "alice@berkeley.edu",
        fullName: "Alice Walker",
        college: "UC Berkeley",
        major: "EECS",
        gradYear: 2026,
        experienceLevel: "junior",
        workingStyle: "fast-paced",
        skills: [{ id: "sk_a1", name: "Solidity", category: "backend", proficiency: 4, yearsExperience: 2 }],
        interests: [],
        availability: { hoursPerWeek: 12, timezone: "PST", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
      };

      const userB: StudentProfile = {
        id: "usr_bob",
        email: "bob@cmu.edu",
        fullName: "Bob Vance",
        college: "CMU",
        major: "Robotics",
        gradYear: 2025,
        experienceLevel: "senior",
        workingStyle: "structured",
        skills: [{ id: "sk_b1", name: "ROS", category: "robotics", proficiency: 5, yearsExperience: 3 }],
        interests: [],
        availability: { hoursPerWeek: 20, timezone: "EST", prefersRemote: false, weekendAvailability: true, weekdayEvenings: true },
      };

      await ProfileService.updateProfile(userA, true);
      const loadedA = await ProfileService.getCurrentProfile();
      expect(loadedA?.fullName).toBe("Alice Walker");
      expect(loadedA?.skills[0].name).toBe("Solidity");

      await ProfileService.updateProfile(userB, true);
      const loadedB = await ProfileService.getCurrentProfile();
      expect(loadedB?.fullName).toBe("Bob Vance");
      expect(loadedB?.skills[0].name).toBe("ROS");
      expect(loadedB?.skills.find((s) => s.name === "Solidity")).toBeUndefined();
    });
  });

  describe("6. Chat Deletion Verification", () => {
    it("should allow an authorized user to delete a conversation and clean up local cache", async () => {
      const conv = await ChatService.createDirectConversation("usr_curr_01", "usr_04", true);
      expect(conv.success).toBe(true);
      expect(conv.conversation).toBeDefined();

      const convId = conv.conversation!.id;

      // Send a message in the conversation
      await ChatService.sendMessage(convId, "usr_curr_01", "Hello Elena!", true);
      const msgsBefore = await ChatService.getMessages(convId);
      expect(msgsBefore.length).toBeGreaterThan(0);

      // Delete the conversation
      const delRes = await ChatService.deleteConversation(convId, "usr_curr_01", true);
      expect(delRes.success).toBe(true);

      // Verify conversation and message cache removal
      const convsAfter = await ChatService.getConversations("usr_curr_01");
      expect(convsAfter.some((c) => c.id === convId)).toBe(false);

      const msgsAfter = await ChatService.getMessages(convId);
      expect(msgsAfter.length).toBe(0);
    });
  });
});
