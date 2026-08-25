import { describe, it, expect } from "vitest";
import { MatchingEngine } from "./engine";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";

describe("MatchingEngine (Deterministic Compatibility & Synergy Scoring)", () => {
  const engine = new MatchingEngine();

  const mockBaseStudent: StudentProfile = {
    id: "usr_test_1",
    email: "student@stanford.edu",
    fullName: "Alex Chen",
    college: "Stanford University",
    major: "Computer Science",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_1", name: "React", category: "frontend", proficiency: 4, yearsExperience: 2 },
      { id: "sk_2", name: "Python", category: "backend", proficiency: 4, yearsExperience: 2 },
      { id: "sk_3", name: "TypeScript", category: "frontend", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_1", name: "AI/ML", category: "tech" }],
    availability: {
      hoursPerWeek: 15,
      timezone: "America/Los_Angeles",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const mockProject: Project = {
    id: "proj_test_1",
    ownerId: "usr_owner_1",
    title: "AI Audio Platform",
    tagline: "Next-gen audio processing",
    description: "Building an audio platform with ML models and React web UI",
    category: "AI/ML",
    status: "recruiting",
    maxTeamSize: 4,
    durationWeeks: 10,
    hoursPerWeek: 12,
    requiredSkills: [
      {
        skill: { id: "sk_1", name: "React", category: "frontend" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_2", name: "Python", category: "backend" },
        requiredProficiency: 4,
        importance: "required",
      },
    ],
    missingRoles: ["Frontend Engineer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("calculates high compatibility score for students with fully matched required skills", () => {
    const result = engine.calculateIndividualMatch(mockBaseStudent, mockProject);

    expect(result.breakdown.skillScore).toBe(100);
    expect(result.matchedSkills.length).toBe(2);
    expect(result.missingSkills.length).toBe(0);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
  });

  it("reduces skill score and lists missing skills when required skills are missing", () => {
    const studentMissingSkills: StudentProfile = {
      ...mockBaseStudent,
      skills: [{ id: "sk_1", name: "React", category: "frontend", proficiency: 4, yearsExperience: 2 }],
    };

    const result = engine.calculateIndividualMatch(studentMissingSkills, mockProject);

    expect(result.breakdown.skillScore).toBe(50);
    expect(result.missingSkills).toContain("Python");
    expect(result.matchedSkills.length).toBe(1);
    expect(result.overallScore).toBeLessThan(85);
  });

  it("scales availability score when student weekly hours are below project requirements", () => {
    const studentLowAvail: StudentProfile = {
      ...mockBaseStudent,
      availability: {
        ...mockBaseStudent.availability,
        hoursPerWeek: 6, // Project requires 12
      },
    };

    const result = engine.calculateIndividualMatch(studentLowAvail, mockProject);

    expect(result.breakdown.availabilityScore).toBe(50); // 6 / 12 = 50%
  });

  it("rewards aligned working styles with high workingStyle score", () => {
    const collaborativeStudent: StudentProfile = {
      ...mockBaseStudent,
      workingStyle: "collaborative",
    };

    const result = engine.calculateIndividualMatch(collaborativeStudent, mockProject);
    expect(result.breakdown.workingStyleScore).toBeGreaterThanOrEqual(80);
  });

  it("evaluates multi-member team composition and calculates aggregate skill coverage", () => {
    const peerStudent: StudentProfile = {
      ...mockBaseStudent,
      id: "usr_test_2",
      fullName: "Maya Lin",
      skills: [
        { id: "sk_4", name: "PyTorch", category: "ml_ai", proficiency: 5, yearsExperience: 3 },
      ],
    };

    const teamEvaluation = engine.evaluateTeamComposition([mockBaseStudent, peerStudent], mockProject);

    expect(teamEvaluation.teamScore).toBeGreaterThanOrEqual(75);
    expect(teamEvaluation.skillCoverages.length).toBeGreaterThan(0);
    expect(teamEvaluation.gaps.missingSkills.length).toBe(0);
  });
});
