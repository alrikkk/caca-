import { describe, it, expect } from "vitest";
import { MatchingEngine } from "@/matching/engine";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";

describe("Phase 4 - Missing Role Detection & Candidate Ranking", () => {
  const engine = new MatchingEngine();

  const candidateA: StudentProfile = {
    id: "cand_a",
    email: "a@stanford.edu",
    fullName: "Maya Patel",
    headline: "Machine Learning Researcher",
    college: "Stanford University",
    major: "Computer Science",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "structured",
    skills: [
      { id: "sk_pytorch", name: "PyTorch", category: "ml_ai", proficiency: 5, yearsExperience: 3 },
      { id: "sk_python", name: "Python", category: "backend", proficiency: 5, yearsExperience: 4 },
    ],
    interests: [{ id: "int_ai", name: "Computer Vision", category: "ai" }],
    availability: {
      hoursPerWeek: 15,
      timezone: "PST",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const candidateB: StudentProfile = {
    id: "cand_b",
    email: "b@mit.edu",
    fullName: "Jordan Lee",
    headline: "Product & UI/UX Designer",
    college: "MIT",
    major: "Design & Computation",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_figma", name: "UI/UX Design", category: "design", proficiency: 5, yearsExperience: 3 },
      { id: "sk_css", name: "Tailwind CSS", category: "frontend", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_hci", name: "Accessible Design", category: "design" }],
    availability: {
      hoursPerWeek: 12,
      timezone: "EST",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: false,
    },
  };

  const candidateC: StudentProfile = {
    id: "cand_c",
    email: "c@cmu.edu",
    fullName: "Arjun Kumar",
    headline: "Distributed Systems & Cloud Engineer",
    college: "Carnegie Mellon University",
    major: "EECS",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "independent",
    skills: [
      { id: "sk_rust", name: "Rust", category: "backend", proficiency: 5, yearsExperience: 3 },
      { id: "sk_docker", name: "Docker", category: "devops", proficiency: 4, yearsExperience: 2 },
      { id: "sk_postgres", name: "PostgreSQL", category: "backend", proficiency: 4, yearsExperience: 3 },
    ],
    interests: [{ id: "int_sys", name: "High Performance Computing", category: "systems" }],
    availability: {
      hoursPerWeek: 10,
      timezone: "EST",
      prefersRemote: true,
      weekendAvailability: false,
      weekdayEvenings: true,
    },
  };

  const testProject: Project = {
    id: "proj_health_ai",
    ownerId: "cand_a",
    title: "MedScan AI: Realtime Ultrasound Diagnosis",
    tagline: "Point-of-care ultrasound diagnostic assist",
    description: "Deep learning models for ultrasound segmentation with accessible clinical tablet UI.",
    category: "Healthcare & AI",
    status: "recruiting",
    maxTeamSize: 4,
    durationWeeks: 12,
    hoursPerWeek: 12,
    requiredSkills: [
      {
        skill: { id: "sk_pytorch", name: "PyTorch", category: "ml_ai" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_figma", name: "UI/UX Design", category: "design" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_rust", name: "Rust", category: "backend" },
        requiredProficiency: 3,
        importance: "preferred",
      },
    ],
    missingRoles: ["UI/UX Designer", "Systems Engineer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("detects missing skills when evaluating a single-member team", () => {
    const singleMemberSynergy = engine.evaluateTeamSynergy([candidateA], testProject);

    expect(singleMemberSynergy.skillCoverageRatio).toBeLessThan(1.0);
    expect(singleMemberSynergy.gaps.missingSkills).toContain("UI/UX Design");
    expect(singleMemberSynergy.gaps.missingSkills).toContain("Rust");
    expect(singleMemberSynergy.gaps.missingSkills).not.toContain("PyTorch");
  });

  it("evaluates 100% skill coverage when all complementary candidates are added", () => {
    const fullTeamSynergy = engine.evaluateTeamSynergy([candidateA, candidateB, candidateC], testProject);

    expect(fullTeamSynergy.skillCoverageRatio).toBe(1.0);
    expect(fullTeamSynergy.gaps.missingSkills.length).toBe(0);
    expect(fullTeamSynergy.teamScore).toBeGreaterThanOrEqual(85);

    // Verify covered by metadata
    const figmaCoverage = fullTeamSynergy.skillCoverages.find((s) => s.skillName === "UI/UX Design");
    expect(figmaCoverage?.isCovered).toBe(true);
    expect(figmaCoverage?.coveredBy?.userName).toBe("Jordan Lee");
  });

  it("ranks candidates specifically for a missing role (UI/UX Designer)", () => {
    const pool = [candidateA, candidateB, candidateC];
    const ranked = engine.rankCandidatesForRole(
      pool,
      "UI/UX Designer",
      ["UI/UX Design"],
      testProject
    );

    expect(ranked.length).toBe(3);
    // Jordan Lee has proficiency 5 in UI/UX Design -> rank #1
    expect(ranked[0].candidate.id).toBe("cand_b");
    expect(ranked[0].fitScore).toBeGreaterThan(ranked[1].fitScore);
    expect(ranked[0].matchedSkills).toContain("UI/UX Design");
  });

  it("ranks candidates specifically for a systems role (Rust / Cloud)", () => {
    const pool = [candidateA, candidateB, candidateC];
    const ranked = engine.rankCandidatesForRole(
      pool,
      "Backend Systems Engineer",
      ["Rust", "PostgreSQL"],
      testProject
    );

    expect(ranked.length).toBe(3);
    // Arjun Kumar has Rust & PostgreSQL -> rank #1
    expect(ranked[0].candidate.id).toBe("cand_c");
    expect(ranked[0].matchedSkills).toContain("Rust");
    expect(ranked[0].fitScore).toBeGreaterThan(ranked[1].fitScore);
  });

  it("iteratively builds a balanced squad recommendation with marginal synergy gain", () => {
    const candidatePool = [candidateB, candidateC];
    const squadResult = engine.buildRecommendedSquad(candidatePool, testProject, [candidateA]);

    expect(squadResult.recommendedMembers.length).toBe(3);
    const memberIds = squadResult.recommendedMembers.map((m) => m.student.id);
    expect(memberIds).toContain("cand_a");
    expect(memberIds).toContain("cand_b");
    expect(memberIds).toContain("cand_c");
    expect(squadResult.synergyBreakdown?.skillCoverage).toBe(100);
  });
});
