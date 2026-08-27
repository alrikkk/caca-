import { describe, it, expect, vi, beforeEach } from "vitest";
import { AISanitizer } from "@/ai/sanitizer";
import { MockAIProvider } from "@/ai/mock-provider";
import { ServerAIProvider } from "@/ai/server-provider";
import { StudentProfile } from "@/types/user";
import { Project } from "@/types/project";
import { MOCK_STUDENTS, MOCK_PROJECTS } from "@/lib/mock-data";

describe("Phase 4 - AI Architecture, Privacy Sanitizer & Fallback Safety", () => {
  const sensitiveUser: StudentProfile = {
    id: "usr_real_9999",
    email: "private.user@stanford.edu",
    phoneNumber: "+1-650-555-1234",
    fullName: "Elena Rostova",
    headline: "HCI & Accessible Systems Researcher",
    college: "Carnegie Mellon University",
    major: "Human-Computer Interaction",
    gradYear: 2025,
    experienceLevel: "senior",
    workingStyle: "mentor-oriented",
    skills: [
      { id: "sk_1", name: "Figma", category: "design", proficiency: 5, yearsExperience: 4 },
      { id: "sk_2", name: "React", category: "frontend", proficiency: 4, yearsExperience: 2 },
    ],
    interests: [{ id: "int_1", name: "Assistive Tech", category: "design" }],
    availability: {
      hoursPerWeek: 14,
      timezone: "America/New_York",
      prefersRemote: true,
      weekendAvailability: true,
      weekdayEvenings: true,
    },
  };

  const project: Project = MOCK_PROJECTS[0];

  it("strictly strips private contact data, emails, and phone numbers from LLM context", () => {
    const sanitized = AISanitizer.sanitizeCandidate(sensitiveUser, 0);

    expect(sanitized.id).toBe("usr_real_9999");
    expect(sanitized.aliasId).toBe("cand_1");
    expect(sanitized.fullName).toBe("Elena Rostova");
    expect(sanitized.college).toBe("Carnegie Mellon University");

    const jsonStr = JSON.stringify(sanitized);
    expect(jsonStr).not.toContain("private.user@stanford.edu");
    expect(jsonStr).not.toContain("+1-650-555-1234");
    expect((sanitized as any).email).toBeUndefined();
    expect((sanitized as any).phoneNumber).toBeUndefined();
  });

  it("sanitizes candidate pool with unique alias IDs", () => {
    const pool = [sensitiveUser, { ...sensitiveUser, id: "usr_real_8888", fullName: "Jordan Lee" }];
    const sanitizedPool = AISanitizer.sanitizeCandidatePool(pool);

    expect(sanitizedPool.length).toBe(2);
    expect(sanitizedPool[0].aliasId).toBe("cand_1");
    expect(sanitizedPool[1].aliasId).toBe("cand_2");
    expect(sanitizedPool[0].fullName).toBe("Elena Rostova");
    expect(sanitizedPool[1].fullName).toBe("Jordan Lee");
  });

  it("sanitizes project metadata cleanly for prompt serialization", () => {
    const sanitizedProject = AISanitizer.sanitizeProject(project);

    expect(sanitizedProject.id).toBe(project.id);
    expect(sanitizedProject.title).toBe(project.title);
    expect(sanitizedProject.requiredSkills.length).toBe(project.requiredSkills.length);
    expect(sanitizedProject.hoursPerWeek).toBe(project.hoursPerWeek);
  });

  it("parses diverse natural language search concepts into structured filters", async () => {
    const provider = new MockAIProvider();

    // Test case 1: Skill + Domain
    const query1 = await provider.parseSearchIntent("Python developer interested in healthcare");
    expect(query1.extractedSkills).toContain("python");
    expect(query1.extractedRoles).toContain("developer");
    expect(query1.extractedCategories).toContain("healthcare");

    // Test case 2: Role + Schedule
    const query2 = await provider.parseSearchIntent("frontend student available evenings");
    expect(query2.extractedRoles).toContain("student");
    expect(query2.availabilityPreference?.prefersEvenings).toBe(true);

    // Test case 3: Skill + Role
    const query3 = await provider.parseSearchIntent("designer who knows React");
    expect(query3.extractedSkills).toContain("react");
    expect(query3.extractedRoles).toContain("designer");
  });

  it("falls back reliably to deterministic matching when server AI has no live key", async () => {
    const serverProvider = new ServerAIProvider();

    // Call explainIndividualMatch without API key configured
    const explanation = await serverProvider.explainIndividualMatch(project, sensitiveUser);
    expect(explanation).toBeDefined();
    expect(explanation.overallFitScore).toBeGreaterThan(0);
    expect(explanation.whyYouMatch.length).toBeGreaterThan(0);

    // Call squadBuilder without API key configured
    const squad = await serverProvider.recommendSquad(project, MOCK_STUDENTS.slice(1, 4));
    expect(squad).toBeDefined();
    expect(squad.recommendedSquad.length).toBeGreaterThan(0);
    expect(squad.predictedSynergyScore).toBeGreaterThan(0);

    // Call teamSynergy without API key configured
    const synergy = await serverProvider.explainTeamSynergy(project, MOCK_STUDENTS.slice(0, 3));
    expect(synergy).toBeDefined();
    expect(synergy.synergyScore).toBeGreaterThan(0);
  });
});
