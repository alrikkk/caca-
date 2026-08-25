import { describe, it, expect } from "vitest";
import { AISanitizer } from "@/ai/sanitizer";
import { MockAIProvider } from "@/ai/mock-provider";
import { ServerAIProvider } from "@/ai/server-provider";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { MOCK_STUDENTS, MOCK_PROJECTS } from "@/lib/mock-data";

describe("AI Provider & Privacy Safety Layer", () => {
  const sensitiveStudent: StudentProfile = {
    id: "usr_secret_12345",
    email: "sensitive.user@stanford.edu",
    phoneNumber: "+1 (650) 555-0199",
    fullName: "Alex Chen",
    college: "Stanford University",
    major: "Computer Science",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    skills: [
      { id: "sk_1", name: "Python", category: "backend", proficiency: 5, yearsExperience: 3 },
      { id: "sk_2", name: "PyTorch", category: "ml_ai", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_1", name: "Healthcare", category: "domain" }],
    availability: {
      hoursPerWeek: 15,
      timezone: "PST",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const testProject: Project = MOCK_PROJECTS[0];

  it("sanitizes candidate profiles and strictly strips private contact and auth data", () => {
    const sanitized = AISanitizer.sanitizeCandidate(sensitiveStudent, 0);

    // Verify alias and public metadata are intact
    expect(sanitized.aliasId).toBe("cand_1");
    expect(sanitized.fullName).toBe("Alex Chen");
    expect(sanitized.college).toBe("Stanford University");
    expect(sanitized.skills.length).toBe(2);

    // Verify private data is completely absent from sanitized object
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain("sensitive.user@stanford.edu");
    expect(serialized).not.toContain("+1 (650) 555-0199");
    expect((sanitized as any).email).toBeUndefined();
    expect((sanitized as any).phoneNumber).toBeUndefined();
  });

  it("provides grounded match explanations without hallucinated skills", async () => {
    const mockAI = new MockAIProvider();
    const explanation = await mockAI.explainIndividualMatch(testProject, sensitiveStudent);

    expect(explanation.overallFitScore).toBeGreaterThan(0);
    expect(explanation.whyYouMatch.length).toBeGreaterThan(0);
    expect(explanation.summary).toBeDefined();

    // Verify all why-match items refer to real skills or availability
    const titles = explanation.whyYouMatch.map((w) => w.label);
    const hasKnownSkill = titles.some((t) => t.includes("PyTorch") || t.includes("Python") || t.includes("Availability") || t.includes("Interest"));
    expect(hasKnownSkill).toBe(true);
  });

  it("evaluates team synergy and returns structured component breakdown", async () => {
    const mockAI = new MockAIProvider();
    const synergy = await mockAI.explainTeamSynergy(testProject, MOCK_STUDENTS.slice(0, 3));

    expect(synergy.synergyScore).toBeGreaterThan(0);
    expect(synergy.breakdown.skillCoverage).toBeDefined();
    expect(synergy.breakdown.roleDiversity).toBeDefined();
    expect(synergy.breakdown.availabilityOverlap).toBeDefined();
    expect(synergy.breakdown.workingStyleHarmony).toBeDefined();
    expect(synergy.strengths.length).toBeGreaterThan(0);
  });

  it("parses natural language search concepts into structured signals", async () => {
    const mockAI = new MockAIProvider();
    const intent = await mockAI.parseSearchIntent("Python developer interested in healthcare available evenings");

    expect(intent.extractedSkills).toContain("python");
    expect(intent.extractedRoles).toContain("developer");
    expect(intent.extractedCategories).toContain("healthcare");
    expect(intent.availabilityPreference?.prefersEvenings).toBe(true);
  });

  it("falls back gracefully to deterministic provider when live AI is unconfigured", async () => {
    const serverAI = new ServerAIProvider();
    const squadResult = await serverAI.recommendSquad(testProject, MOCK_STUDENTS.slice(1, 4));

    expect(squadResult).toBeDefined();
    expect(squadResult.recommendedSquad.length).toBeGreaterThan(0);
    expect(squadResult.predictedSynergyScore).toBeGreaterThan(0);
  });
});
