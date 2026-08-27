import { describe, it, expect } from "vitest";
import { MatchingEngine } from "@/matching/engine";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { MATCHING_WEIGHTS, MATCHING_THRESHOLDS } from "@/matching/config";

describe("Phase 4 - Explainable Matching Engine", () => {
  const engine = new MatchingEngine();

  const mockStudent: StudentProfile = {
    id: "usr_exp_1",
    email: "student@berkeley.edu",
    fullName: "Jordan Lee",
    college: "UC Berkeley",
    major: "Electrical Engineering & Computer Science",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_py", name: "Python", category: "backend", proficiency: 5, yearsExperience: 3 },
      { id: "sk_torch", name: "PyTorch", category: "ml_ai", proficiency: 4, yearsExperience: 2 },
      { id: "sk_react", name: "React", category: "frontend", proficiency: 3, yearsExperience: 1 },
    ],
    interests: [
      { id: "int_health", name: "Assistive Technology", category: "health" },
    ],
    availability: {
      hoursPerWeek: 16,
      timezone: "America/Los_Angeles",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const mockProject: Project = {
    id: "proj_exp_1",
    ownerId: "usr_owner_9",
    title: "NeuroVision: AI Mobility Assist",
    tagline: "Assistive vision platform for visually impaired students",
    description: "Computer vision and accessible web client for classroom navigation.",
    category: "Assistive Technology",
    status: "recruiting",
    maxTeamSize: 4,
    durationWeeks: 10,
    hoursPerWeek: 12,
    requiredSkills: [
      {
        skill: { id: "sk_torch", name: "PyTorch", category: "ml_ai" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_react", name: "React", category: "frontend" },
        requiredProficiency: 4,
        importance: "required",
      },
      {
        skill: { id: "sk_figma", name: "UI/UX Design", category: "design" },
        requiredProficiency: 3,
        importance: "preferred",
      },
    ],
    missingRoles: ["UI/UX Designer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("produces structured match output with exact breakdown fields", () => {
    const result = engine.calculateIndividualMatch(mockStudent, mockProject);

    expect(result.userId).toBe("usr_exp_1");
    expect(result.projectId).toBe("proj_exp_1");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);

    // Verify all breakdown components exist and are within 0-100
    const { breakdown } = result;
    expect(breakdown.skillScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.skillScore).toBeLessThanOrEqual(100);
    expect(breakdown.experienceScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.experienceScore).toBeLessThanOrEqual(100);
    expect(breakdown.availabilityScore).toBe(100); // 16h >= 12h
    expect(breakdown.interestScore).toBe(95); // Category alignment
    expect(breakdown.roleScore).toBeGreaterThanOrEqual(50);
    expect(breakdown.workingStyleScore).toBeGreaterThanOrEqual(80);
  });

  it("identifies skill matches and missing skills accurately based on structured requirements", () => {
    const result = engine.calculateIndividualMatch(mockStudent, mockProject);

    const matchedNames = result.matchedSkills.map((m) => m.skillName);
    expect(matchedNames).toContain("PyTorch");
    expect(matchedNames).toContain("React");

    expect(result.missingSkills).toContain("UI/UX Design");
    expect(result.missingSkills).not.toContain("PyTorch");
  });

  it("generates grounded WHY YOU MATCH items without hallucinating attributes", () => {
    const result = engine.calculateIndividualMatch(mockStudent, mockProject);

    expect(result.whyYouMatch).toBeDefined();
    const whyItems = result.whyYouMatch || [];
    expect(whyItems.length).toBeGreaterThan(0);

    // Verify why items are marked isPositive: true
    whyItems.forEach((item) => {
      expect(item.isPositive).toBe(true);
      expect(item.title).toBeTruthy();
      expect(item.detail).toBeTruthy();
    });

    // Check presence of PyTorch skill match
    const pyTorchWhy = whyItems.find((w) => w.title === "PyTorch");
    expect(pyTorchWhy).toBeDefined();
    expect(pyTorchWhy?.detail).toContain("4/5");

    // Check availability match item
    const availWhy = whyItems.find((w) => w.type === "availability");
    expect(availWhy).toBeDefined();
    expect(availWhy?.detail).toContain("16h/wk");
  });

  it("generates structured MISSING / GAP items with precise reasons", () => {
    const result = engine.calculateIndividualMatch(mockStudent, mockProject);

    expect(result.missingPoints).toBeDefined();
    const missingItems = result.missingPoints || [];
    expect(missingItems.length).toBeGreaterThan(0);

    const missingSkill = missingItems.find((m) => m.title === "UI/UX Design");
    expect(missingSkill).toBeDefined();
    expect(missingSkill?.isPositive).toBe(false);
  });

  it("handles projects with zero required skills gracefully with default baseline score", () => {
    const emptyProject: Project = {
      ...mockProject,
      requiredSkills: [],
    };

    const result = engine.calculateIndividualMatch(mockStudent, emptyProject);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toEqual([]);
  });

  it("handles student with insufficient weekly availability", () => {
    const lowHoursStudent: StudentProfile = {
      ...mockStudent,
      availability: {
        ...mockStudent.availability,
        hoursPerWeek: 3, // Target is 12h
      },
    };

    const result = engine.calculateIndividualMatch(lowHoursStudent, mockProject);
    expect(result.breakdown.availabilityScore).toBe(25); // 3 / 12 = 25%

    const missingItems = result.missingPoints || [];
    const availGap = missingItems.find((m) => m.type === "availability");
    expect(availGap).toBeDefined();
    expect(availGap?.detail).toContain("3h/wk vs 12h/wk");
  });
});
