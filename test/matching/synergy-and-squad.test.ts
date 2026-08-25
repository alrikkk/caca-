import { describe, it, expect } from "vitest";
import { MatchingEngine } from "@/matching/engine";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { MATCHING_WEIGHTS } from "@/matching/config";

describe("MatchingEngine - Phase 3 Team Synergy & Candidate Ranking", () => {
  const engine = new MatchingEngine();

  const studentA: StudentProfile = {
    id: "usr_a",
    email: "studentA@stanford.edu",
    fullName: "Alex Chen",
    college: "Stanford University",
    major: "Computer Science",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_react", name: "React", category: "frontend", proficiency: 5, yearsExperience: 3 },
      { id: "sk_ts", name: "TypeScript", category: "frontend", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_ai", name: "AI Systems", category: "ai" }],
    availability: {
      hoursPerWeek: 15,
      timezone: "America/Los_Angeles",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const studentB: StudentProfile = {
    id: "usr_b",
    email: "studentB@mit.edu",
    fullName: "Maya Patel",
    college: "MIT",
    major: "EECS",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "structured",
    skills: [
      { id: "sk_pytorch", name: "PyTorch", category: "ml_ai", proficiency: 5, yearsExperience: 3 },
      { id: "sk_python", name: "Python", category: "backend", proficiency: 5, yearsExperience: 4 },
    ],
    interests: [{ id: "int_ai", name: "AI Systems", category: "ai" }],
    availability: {
      hoursPerWeek: 12,
      timezone: "America/New_York",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: false,
    },
  };

  const studentC: StudentProfile = {
    id: "usr_c",
    email: "studentC@cmu.edu",
    fullName: "Elena Rostova",
    college: "Carnegie Mellon University",
    major: "HCI",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "mentor-oriented",
    skills: [
      { id: "sk_figma", name: "UI/UX Design", category: "design", proficiency: 5, yearsExperience: 4 },
      { id: "sk_design_sys", name: "Design Systems", category: "design", proficiency: 4, yearsExperience: 3 },
    ],
    interests: [{ id: "int_design", name: "Spatial Design", category: "design" }],
    availability: {
      hoursPerWeek: 10,
      timezone: "America/New_York",
      prefersRemote: true,
      weekendAvailability: false,
      weekdayEvenings: true,
    },
  };

  const mockProject: Project = {
    id: "proj_echospatial",
    ownerId: "usr_b",
    title: "EchoSpatial",
    tagline: "LiDAR Point Clouds to 3D Audio",
    description: "Multi-modal spatial acoustic navigation for assistive mobility.",
    category: "AI Systems",
    status: "recruiting",
    maxTeamSize: 3,
    durationWeeks: 8,
    hoursPerWeek: 12,
    requiredSkills: [
      {
        skill: { id: "sk_react", name: "React", category: "frontend" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_pytorch", name: "PyTorch", category: "ml_ai" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_figma", name: "UI/UX Design", category: "design" },
        requiredProficiency: 3,
        importance: "preferred",
      },
    ],
    missingRoles: ["Frontend Architect", "UI/UX Designer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("preserves exact deterministic weight invariants", () => {
    expect(MATCHING_WEIGHTS.skillMatch).toBe(0.35);
    expect(MATCHING_WEIGHTS.experience).toBe(0.20);
    expect(MATCHING_WEIGHTS.availability).toBe(0.15);
    expect(MATCHING_WEIGHTS.interestAlignment).toBe(0.15);
    expect(MATCHING_WEIGHTS.roleCompatibility).toBe(0.10);
    expect(MATCHING_WEIGHTS.workingStyle).toBe(0.05);

    const totalWeight =
      MATCHING_WEIGHTS.skillMatch +
      MATCHING_WEIGHTS.experience +
      MATCHING_WEIGHTS.availability +
      MATCHING_WEIGHTS.interestAlignment +
      MATCHING_WEIGHTS.roleCompatibility +
      MATCHING_WEIGHTS.workingStyle;

    expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
  });

  it("produces grounded WHY YOU MATCH and MISSING structured explanations", () => {
    const matchA = engine.calculateIndividualMatch(studentA, mockProject);

    expect(matchA.whyYouMatch).toBeDefined();
    expect(matchA.missingPoints).toBeDefined();

    // Student A has React (matched)
    const hasReactWhy = matchA.whyYouMatch?.some((w) => w.title.includes("React"));
    expect(hasReactWhy).toBe(true);

    // Student A is missing PyTorch and Figma
    const missingSkills = matchA.missingPoints?.map((m) => m.title);
    expect(missingSkills).toContain("PyTorch");
    expect(missingSkills).toContain("UI/UX Design");
  });

  it("evaluates team synergy with component transparency", () => {
    const singleMemberSynergy = engine.evaluateTeamSynergy([studentB], mockProject);
    const fullTeamSynergy = engine.evaluateTeamSynergy([studentA, studentB, studentC], mockProject);

    expect(singleMemberSynergy.teamScore).toBeLessThan(fullTeamSynergy.teamScore);
    expect(fullTeamSynergy.synergyBreakdown).toBeDefined();

    if (fullTeamSynergy.synergyBreakdown) {
      expect(fullTeamSynergy.synergyBreakdown.skillCoverage).toBe(100);
      expect(fullTeamSynergy.synergyBreakdown.roleDiversity).toBeGreaterThanOrEqual(70);
      expect(fullTeamSynergy.synergyBreakdown.availabilityOverlap).toBeGreaterThanOrEqual(80);
      expect(fullTeamSynergy.synergyBreakdown.workingStyleHarmony).toBeGreaterThanOrEqual(80);
    }
  });

  it("ranks candidates appropriately for missing roles", () => {
    const pool = [studentA, studentB, studentC];
    const rankedForDesign = engine.rankCandidatesForRole(
      pool,
      "UI/UX Designer",
      ["UI/UX Design"],
      mockProject
    );

    expect(rankedForDesign.length).toBe(3);
    // Student C has Figma/UI/UX at level 5, should be #1
    expect(rankedForDesign[0].candidate.id).toBe("usr_c");
    expect(rankedForDesign[0].matchedSkills).toContain("UI/UX Design");
  });

  it("deterministically builds optimal squad recommendations", () => {
    const candidatePool = [studentA, studentC];
    const squad = engine.buildRecommendedSquad(candidatePool, mockProject, [studentB]);

    expect(squad.recommendedMembers.length).toBe(3);
    const memberIds = squad.recommendedMembers.map((m) => m.student.id);
    expect(memberIds).toContain("usr_a");
    expect(memberIds).toContain("usr_b");
    expect(memberIds).toContain("usr_c");
    expect(squad.teamScore).toBeGreaterThanOrEqual(85);
  });
});
