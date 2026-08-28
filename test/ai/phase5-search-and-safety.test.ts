import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/ai/mock-provider";
import { ServerAIProvider } from "@/ai/server-provider";
import { AISanitizer } from "@/ai/sanitizer";
import { StudentProfile } from "@/types/user";
import { MOCK_PROJECTS } from "@/lib/mock-data";

describe("Phase 5 - Smarter Natural Language Search Intent & AI Safety", () => {
  const mockAI = new MockAIProvider();

  it("extracts structured intent for 'Python developer interested in healthcare'", async () => {
    const intent = await mockAI.parseSearchIntent("Python developer interested in healthcare");

    expect(intent.extractedSkills).toContain("Python");
    expect(intent.extractedRoles).toContain("Developer");
    expect(intent.extractedCategories).toContain("Healthcare");
    expect(intent.extractedSkills).not.toContain("Healthcare");
  });

  it("extracts structured intent for 'React designer available weekends'", async () => {
    const intent = await mockAI.parseSearchIntent("React designer available weekends");

    expect(intent.extractedSkills).toContain("React");
    expect(intent.extractedRoles).toContain("Designer");
    expect(intent.availabilityPreference?.prefersWeekends).toBe(true);
    expect(intent.extractedCategories).not.toContain("Weekends");
  });

  it("extracts structured intent for 'ML student who likes accessibility'", async () => {
    const intent = await mockAI.parseSearchIntent("ML student who likes accessibility");

    expect(intent.extractedSkills).toContain("Machine Learning");
    expect(intent.extractedRoles).toContain("Student");
    expect(intent.extractedCategories).toContain("Accessibility");
    expect(intent.experiencePreference).toBeUndefined();
  });

  it("extracts structured intent for 'Frontend developer for a hackathon'", async () => {
    const intent = await mockAI.parseSearchIntent("Frontend developer for a hackathon");

    expect(intent.extractedSkills).toContain("Frontend");
    expect(intent.extractedRoles).toContain("Developer");
    expect(intent.projectCategory).toBe("Hackathon");
    expect(intent.extractedSkills).not.toContain("Hackathon");
  });

  it("guarantees zero private credential exposure in AISanitizer", () => {
    const testStudent: StudentProfile = {
      id: "usr_secure_007",
      email: "confidential@university.edu",
      phoneNumber: "+1-800-555-0199",
      fullName: "Alex Chen",
      college: "Stanford University",
      major: "Computer Science",
      gradYear: 2026,
      experienceLevel: "junior",
      workingStyle: "collaborative",
      skills: [{ id: "sk_1", name: "Python", category: "backend", proficiency: 5, yearsExperience: 3 }],
      interests: [{ id: "int_1", name: "Healthcare", category: "domain" }],
      availability: {
        hoursPerWeek: 15,
        timezone: "PST",
        prefersRemote: true,
        weekendAvailability: true,
        weekdayEvenings: true,
      },
    };

    const sanitized = AISanitizer.sanitizeCandidate(testStudent, 0);
    const jsonStr = JSON.stringify(sanitized);

    expect(jsonStr).not.toContain("confidential@university.edu");
    expect(jsonStr).not.toContain("+1-800-555-0199");
    expect((sanitized as any).email).toBeUndefined();
    expect((sanitized as any).phoneNumber).toBeUndefined();
    expect(sanitized.aliasId).toBe("cand_1");
  });

  it("handles server AI fallback seamlessly on timeout or missing credentials", async () => {
    const serverAI = new ServerAIProvider();
    const explanation = await serverAI.explainIndividualMatch(MOCK_PROJECTS[0], {
      id: "usr_fallback",
      email: "test@test.edu",
      fullName: "Test Student",
      college: "University",
      major: "CS",
      gradYear: 2026,
      experienceLevel: "junior",
      workingStyle: "collaborative",
      skills: [{ id: "sk_1", name: "React", category: "frontend", proficiency: 4, yearsExperience: 2 }],
      interests: [],
      availability: { hoursPerWeek: 10, timezone: "UTC", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
    });

    expect(explanation).toBeDefined();
    expect(explanation.overallFitScore).toBeGreaterThan(0);
    expect(explanation.whyYouMatch.length).toBeGreaterThan(0);
  });
});
