import { describe, it, expect, beforeEach } from "vitest";
import { defaultMatchingEngine } from "@/matching/engine";
import { BookmarkService } from "@/services/bookmark-service";
import { ProfileService } from "@/services/profile-service";
import { MOCK_STUDENTS, MOCK_PROJECTS } from "@/lib/mock-data";

describe("Phase 8: Smart Recommendations, Readiness & Bookmarks", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("Smart Recommendation Signals", () => {
    it("returns STRONG MATCH for score >= 85%", () => {
      const signal = defaultMatchingEngine.getRecommendationSignal(92, 0);
      expect(signal.label).toBe("STRONG MATCH");
      expect(signal.variant).toBe("lime");
    });

    it("returns GOOD FIT for score between 70% and 84%", () => {
      const signal = defaultMatchingEngine.getRecommendationSignal(78, 0);
      expect(signal.label).toBe("GOOD FIT");
      expect(signal.variant).toBe("yellow");
    });

    it("returns SKILL GAP when missing critical skills", () => {
      const signal = defaultMatchingEngine.getRecommendationSignal(60, 2);
      expect(signal.label).toBe("SKILL GAP");
      expect(signal.variant).toBe("coral");
    });

    it("returns NEW OPPORTUNITY for exploratory projects", () => {
      const signal = defaultMatchingEngine.getRecommendationSignal(50, 0);
      expect(signal.label).toBe("NEW OPPORTUNITY");
      expect(signal.variant).toBe("outline");
    });
  });

  describe("Team Readiness Evaluation", () => {
    it("returns SQUAD READY when synergy >= 80% and zero missing roles/skills", () => {
      const dummySynergy = {
        projectId: "proj_1",
        teamScore: 88,
        skillCoverageRatio: 1,
        roleDiversityScore: 90,
        availabilityOverlapScore: 90,
        recommendedMembers: [],
        skillCoverages: [],
        gaps: {
          missingSkills: [],
          missingRoles: [],
          riskNotes: [],
        },
      };

      const readiness = defaultMatchingEngine.getTeamReadiness(dummySynergy as any);
      expect(readiness.tier).toBe("READY");
      expect(readiness.statusLabel).toBe("SQUAD READY ✓");
      expect(readiness.variant).toBe("lime");
      expect(readiness.criticalGaps.length).toBe(0);
    });

    it("returns PARTIALLY READY when synergy is moderate or has minor gaps", () => {
      const dummySynergy = {
        projectId: "proj_2",
        teamScore: 72,
        skillCoverageRatio: 0.75,
        roleDiversityScore: 70,
        availabilityOverlapScore: 80,
        recommendedMembers: [],
        skillCoverages: [],
        gaps: {
          missingSkills: ["Docker"],
          missingRoles: [],
          riskNotes: [],
        },
      };

      const readiness = defaultMatchingEngine.getTeamReadiness(dummySynergy as any);
      expect(readiness.tier).toBe("PARTIALLY READY");
      expect(readiness.statusLabel).toBe("PARTIALLY READY △");
      expect(readiness.variant).toBe("yellow");
      expect(readiness.criticalGaps.length).toBe(1);
    });

    it("returns GAPS TO FILL when critical gaps exist", () => {
      const dummySynergy = {
        projectId: "proj_3",
        teamScore: 50,
        skillCoverageRatio: 0.4,
        roleDiversityScore: 50,
        availabilityOverlapScore: 50,
        recommendedMembers: [],
        skillCoverages: [],
        gaps: {
          missingSkills: ["PyTorch", "ROS"],
          missingRoles: ["Embedded Architect", "ML Specialist"],
          riskNotes: ["Major capability tracks unfilled"],
        },
      };

      const readiness = defaultMatchingEngine.getTeamReadiness(dummySynergy as any);
      expect(readiness.tier).toBe("GAPS TO FILL");
      expect(readiness.statusLabel).toContain("GAPS TO FILL ⚠");
      expect(readiness.variant).toBe("coral");
      expect(readiness.criticalGaps.length).toBe(4);
    });
  });

  describe("BookmarkService Persistence & Optimistic Toggle", () => {
    it("saves and toggles project bookmarks for a user", async () => {
      const userId = "usr_test_888";
      const projectId = "proj_autonomous_boat";

      expect(BookmarkService.isBookmarked(userId, projectId)).toBe(false);

      // Save
      const res1 = await BookmarkService.toggleBookmark(userId, projectId);
      expect(res1.success).toBe(true);
      expect(res1.isSaved).toBe(true);
      expect(BookmarkService.isBookmarked(userId, projectId)).toBe(true);

      const savedList = await BookmarkService.getBookmarkedProjectIds(userId);
      expect(savedList).toContain(projectId);

      // Unsave
      const res2 = await BookmarkService.toggleBookmark(userId, projectId);
      expect(res2.success).toBe(true);
      expect(res2.isSaved).toBe(false);
      expect(BookmarkService.isBookmarked(userId, projectId)).toBe(false);
    });
  });

  describe("Profile Completeness Gauge", () => {
    it("calculates accurate completeness scores and tiers", () => {
      const student = MOCK_STUDENTS[0];
      const result = ProfileService.calculateCompleteness(student);

      expect(result.score).toBeGreaterThan(60);
      expect(["COMPLETE", "HIGH QUALITY"]).toContain(result.tier);
    });

    it("handles empty/null profiles gracefully", () => {
      const result = ProfileService.calculateCompleteness(null);
      expect(result.score).toBe(0);
      expect(result.tier).toBe("BASIC");
      expect(result.missingRecommendations.length).toBeGreaterThan(0);
    });
  });
});
