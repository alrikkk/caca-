import { describe, it, expect } from "vitest";
import { IntentParser } from "@/matching/intent-parser";
import { MOCK_STUDENTS } from "@/lib/mock-data";
import { StudentProfile } from "@/types/user";

describe("CACA — Natural Language Search Intent & Ranking Engine", () => {
  describe("1. Structured Intent Parsing & Contextual Precision", () => {
    it("1. Parses 'Python developer interested in healthcare'", () => {
      const intent = IntentParser.parse("Python developer interested in healthcare");

      expect(intent.extractedSkills).toContain("Python");
      expect(intent.extractedRoles).toContain("Developer");
      expect(intent.extractedCategories).toContain("Healthcare");

      // False positive checks:
      expect(intent.extractedSkills).not.toContain("Healthcare");
      expect(intent.extractedRoles).not.toContain("Healthcare");
      expect(intent.availabilityPreference).toBeUndefined();
      expect(intent.experiencePreference).toBeUndefined();
    });

    it("2. Parses 'React designer available weekends'", () => {
      const intent = IntentParser.parse("React designer available weekends");

      expect(intent.extractedSkills).toContain("React");
      expect(intent.extractedRoles).toContain("Designer");
      expect(intent.availabilityPreference?.prefersWeekends).toBe(true);

      // False positive checks:
      expect(intent.extractedSkills).not.toContain("Weekends");
      expect(intent.extractedCategories).not.toContain("Weekends");
      expect(intent.extractedRoles).not.toContain("Weekends");
    });

    it("3. Parses 'ML student who likes accessibility'", () => {
      const intent = IntentParser.parse("ML student who likes accessibility");

      expect(intent.extractedSkills).toContain("Machine Learning");
      expect(intent.extractedRoles).toContain("Student");
      expect(intent.extractedCategories).toContain("Accessibility");

      // Must not invent an unrelated junior level unless explicitly indicated
      expect(intent.experiencePreference).toBeUndefined();
      // Accessibility must not trigger false positive "AI" or "UI/UX" skills
      expect(intent.extractedSkills).not.toContain("AI");
      expect(intent.extractedSkills).not.toContain("UI/UX");
    });

    it("4. Parses 'Frontend developer for a hackathon'", () => {
      const intent = IntentParser.parse("Frontend developer for a hackathon");

      expect(intent.extractedSkills).toContain("Frontend");
      expect(intent.extractedRoles).toContain("Developer");
      expect(intent.projectCategory).toBe("Hackathon");

      // Hackathon is not a person's skill
      expect(intent.extractedSkills).not.toContain("Hackathon");
    });

    it("5. Parses 'Python developer'", () => {
      const intent = IntentParser.parse("Python developer");

      expect(intent.extractedSkills).toEqual(["Python"]);
      expect(intent.extractedRoles).toEqual(["Developer"]);
      expect(intent.extractedCategories).toEqual([]);
      expect(intent.availabilityPreference).toBeUndefined();
      expect(intent.projectCategory).toBeUndefined();
    });

    it("6. Parses 'students interested in robotics'", () => {
      const intent = IntentParser.parse("students interested in robotics");

      expect(intent.extractedRoles).toContain("Student");
      expect(intent.extractedCategories).toContain("Robotics");
      expect(intent.extractedSkills).toEqual([]);
      expect(intent.experiencePreference).toBeUndefined();
    });

    it("7. Parses 'React developer available evenings'", () => {
      const intent = IntentParser.parse("React developer available evenings");

      expect(intent.extractedSkills).toContain("React");
      expect(intent.extractedRoles).toContain("Developer");
      expect(intent.availabilityPreference?.prefersEvenings).toBe(true);
      expect(intent.extractedCategories).toEqual([]);
    });

    it("8. Parses ambiguous query with only one recognized signal ('Figma')", () => {
      const intent = IntentParser.parse("Figma");

      expect(intent.extractedSkills).toEqual(["Figma"]);
      expect(intent.extractedRoles).toEqual([]);
      expect(intent.extractedCategories).toEqual([]);
      expect(intent.availabilityPreference).toBeUndefined();
    });

    it("9. Handles query containing unknown terms gracefully ('Quantum Cobol developer')", () => {
      const intent = IntentParser.parse("Quantum Cobol developer");

      expect(intent.extractedRoles).toContain("Developer");
      expect(intent.keywords).toContain("quantum");
      expect(intent.keywords).toContain("cobol");
    });

    it("10. Handles voice-transcribed query identically to typed query", () => {
      const voiceQuery = "I'm looking for a React developer who can work weekends";
      const intent = IntentParser.parse(voiceQuery);

      expect(intent.extractedSkills).toContain("React");
      expect(intent.extractedRoles).toContain("Developer");
      expect(intent.availabilityPreference?.prefersWeekends).toBe(true);
    });

    it("11. Contextual relationship: 'people who know React and are available evenings'", () => {
      const intent = IntentParser.parse("people who know React and are available evenings");

      expect(intent.extractedSkills).toContain("React");
      expect(intent.availabilityPreference?.prefersEvenings).toBe(true);
      // Must not invent a role
      expect(intent.extractedRoles).toEqual([]);
    });
  });

  describe("2. Explainable Candidate Ranking & Partial Matching", () => {
    const candidateA: StudentProfile = {
      id: "usr_a",
      email: "a@test.edu",
      fullName: "Alice Developer",
      headline: "Full-Stack Python Developer",
      college: "Stanford",
      major: "Computer Science",
      gradYear: 2026,
      experienceLevel: "senior",
      workingStyle: "collaborative",
      skills: [{ id: "s1", name: "Python", category: "backend", proficiency: 5, yearsExperience: 3 }],
      interests: [{ id: "i1", name: "Healthcare Informatics", category: "domain" }],
      availability: { hoursPerWeek: 15, timezone: "PST", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
    };

    const candidateB: StudentProfile = {
      id: "usr_b",
      email: "b@test.edu",
      fullName: "Bob Coder",
      headline: "Python Developer",
      college: "MIT",
      major: "Computer Science",
      gradYear: 2026,
      experienceLevel: "junior",
      workingStyle: "structured",
      skills: [{ id: "s2", name: "Python", category: "backend", proficiency: 4, yearsExperience: 2 }],
      interests: [{ id: "i2", name: "Gaming & Graphics", category: "domain" }],
      availability: { hoursPerWeek: 10, timezone: "EST", prefersRemote: true, weekendAvailability: false, weekdayEvenings: false },
    };

    const candidateC: StudentProfile = {
      id: "usr_c",
      email: "c@test.edu",
      fullName: "Charlie Designer",
      headline: "Product Designer",
      college: "RISD",
      major: "Design",
      gradYear: 2025,
      experienceLevel: "senior",
      workingStyle: "structured",
      skills: [{ id: "s3", name: "Figma", category: "design", proficiency: 5, yearsExperience: 4 }],
      interests: [{ id: "i3", name: "Healthcare & Accessibility", category: "domain" }],
      availability: { hoursPerWeek: 10, timezone: "PST", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
    };

    it("ranks candidates proportionally by intent overlap (Python + Developer + Healthcare)", () => {
      const intent = IntentParser.parse("Python developer interested in healthcare");
      const ranked = IntentParser.rankCandidates([candidateB, candidateC, candidateA], intent);

      // Candidate A satisfies Python + Developer + Healthcare -> highest rank
      expect(ranked[0].candidate.id).toBe("usr_a");
      expect(ranked[0].relevanceScore).toBeGreaterThan(ranked[1].relevanceScore);

      // Candidate B satisfies Python + Developer (partial match) -> middle rank
      expect(ranked[1].candidate.id).toBe("usr_b");

      // Candidate C only satisfies Healthcare -> lower rank
      expect(ranked[2].candidate.id).toBe("usr_c");
    });

    it("ranks candidates correctly for weekend availability queries", () => {
      const intent = IntentParser.parse("React designer available weekends");
      const ranked = IntentParser.rankCandidates(MOCK_STUDENTS, intent);

      // Students with design/frontend and weekend availability rank at top
      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].relevanceScore);
    });
  });
});
