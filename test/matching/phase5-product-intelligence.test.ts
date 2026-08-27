import { describe, it, expect } from "vitest";
import { MatchingEngine } from "@/matching/engine";
import { ProjectService } from "@/services/project-service";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { MOCK_STUDENTS, MOCK_PROJECTS } from "@/lib/mock-data";

describe("Phase 5 - Product Intelligence & Grounded Matching", () => {
  const engine = new MatchingEngine();

  const studentML: StudentProfile = {
    id: "usr_p5_ml",
    email: "ml@berkeley.edu",
    fullName: "Maya Patel",
    headline: "Machine Learning Researcher",
    college: "UC Berkeley",
    major: "Computer Science",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_torch", name: "PyTorch", category: "ml_ai", proficiency: 5, yearsExperience: 3 },
      { id: "sk_py", name: "Python", category: "backend", proficiency: 5, yearsExperience: 4 },
      { id: "sk_react", name: "React", category: "frontend", proficiency: 3, yearsExperience: 1 },
    ],
    interests: [{ id: "int_ai", name: "Assistive Technology", category: "domain" }],
    availability: {
      hoursPerWeek: 16,
      timezone: "PST",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const studentUX: StudentProfile = {
    id: "usr_p5_ux",
    email: "ux@mit.edu",
    fullName: "Jordan Lee",
    headline: "Product & UI/UX Designer",
    college: "MIT",
    major: "Design & Computation",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_figma", name: "UI/UX Design", category: "design", proficiency: 5, yearsExperience: 3 },
      { id: "sk_access", name: "Accessibility", category: "design", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_design", name: "Assistive Technology", category: "domain" }],
    availability: {
      hoursPerWeek: 12,
      timezone: "EST",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: false,
    },
  };

  const project: Project = {
    id: "proj_p5_test",
    ownerId: "usr_p5_ml",
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
        skill: { id: "sk_figma", name: "UI/UX Design", category: "design" },
        requiredProficiency: 4,
        importance: "required",
      },
    ],
    missingRoles: ["UI/UX Designer"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("generates a grounded natural-language summary and match insight badges", () => {
    const match = engine.calculateIndividualMatch(studentML, project);

    expect(match.groundedSummary).toBeDefined();
    expect(match.groundedSummary).toContain("PyTorch");
    expect(match.strongestOverlap).toBeDefined();
    expect(match.strongestOverlap).toContain("PyTorch");
    expect(match.roleGapInsight).toBe("This project still needs a UI/UX Designer contributor.");
    expect(match.scheduleOverlapInsight).toContain("16h/wk availability satisfies");
  });

  it("classifies team capabilities into covered, partially covered, and missing states", () => {
    // Single member has PyTorch (covered), but lacks UI/UX Design (missing)
    const singleMemberSynergy = engine.evaluateTeamSynergy([studentML], project);

    const pyTorchCov = singleMemberSynergy.skillCoverages.find((s) => s.skillName === "PyTorch");
    const figmaCov = singleMemberSynergy.skillCoverages.find((s) => s.skillName === "UI/UX Design");

    expect(pyTorchCov?.status).toBe("covered");
    expect(pyTorchCov?.isCovered).toBe(true);
    expect(figmaCov?.status).toBe("missing");
    expect(figmaCov?.isCovered).toBe(false);

    // Full team has both PyTorch and UI/UX Design covered
    const fullTeamSynergy = engine.evaluateTeamSynergy([studentML, studentUX], project);
    const figmaCovFull = fullTeamSynergy.skillCoverages.find((s) => s.skillName === "UI/UX Design");
    expect(figmaCovFull?.status).toBe("covered");
    expect(figmaCovFull?.isCovered).toBe(true);
    expect(fullTeamSynergy.teamInsightSummary).toContain("100% cross-functional");
  });

  it("optimizes squad composition by prioritizing complementary roles over redundant skills", () => {
    // Another ML candidate with high skills
    const studentML2: StudentProfile = {
      ...studentML,
      id: "usr_p5_ml2",
      fullName: "Alex Chen",
      skills: [
        { id: "sk_torch", name: "PyTorch", category: "ml_ai", proficiency: 5, yearsExperience: 4 },
      ],
    };

    // Pool contains an extra ML candidate and a UX candidate
    const pool = [studentML2, studentUX];
    const squadResult = engine.buildRecommendedSquad(pool, project, [studentML]);

    // The squad should include studentUX because they fill the missing UI/UX Design role
    const memberIds = squadResult.recommendedMembers.map((m) => m.student.id);
    expect(memberIds).toContain("usr_p5_ux");
    expect(squadResult.teamScore).toBeGreaterThanOrEqual(85);
  });

  it("personalizes feed projects ranking based on the active student profile", async () => {
    const feed = await ProjectService.getFeedProjects(MOCK_STUDENTS[0]); // Alex Chen (Frontend/Fullstack lead)

    expect(feed.length).toBeGreaterThan(0);
    // Every project in feed should have computed matchScore and match insights
    feed.forEach((proj) => {
      expect(proj.matchScore).toBeDefined();
      expect(proj.strongestOverlap).toBeDefined();
      expect(proj.scheduleOverlapInsight).toBeDefined();
    });

    // For Alex Chen (strong TypeScript & React), EchoSpatial (proj_01) scores >= 75
    const topProj = feed.find((p) => p.id === "proj_01");
    expect(topProj?.matchScore).toBeGreaterThanOrEqual(75);
  });
});
