import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileService, OnboardingData } from "./profile-service";
import * as supabaseClient from "@/lib/supabase/client";

describe("ProfileService (Data Integrity & Persistence)", () => {
  const mockOnboardingData: OnboardingData = {
    fullName: "Alex Chen",
    college: "Stanford University",
    major: "Computer Science",
    gradYear: 2026,
    experienceLevel: "junior",
    workingStyle: "collaborative",
    bio: "Building innovative student software",
    hoursPerWeek: 15,
    skills: [
      { name: "React", category: "frontend", proficiency: 4 },
      { name: "Python", category: "backend", proficiency: 4 },
    ],
    openTo: ["HACKATHONS", "STARTUPS"],
    availabilityStatus: "AVAILABLE",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws an error when Supabase profiles database upsert fails during onboarding", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

    const mockUpsert = vi.fn().mockResolvedValue({
      error: { message: "Database connection failed or RLS violation." },
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") {
          return { upsert: mockUpsert };
        }
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    } as any;

    vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

    await expect(
      ProfileService.completeOnboarding("usr_123", "test@stanford.edu", mockOnboardingData)
    ).rejects.toThrow("Database connection failed or RLS violation.");

    expect(mockUpsert).toHaveBeenCalled();
  });

  it("successfully persists and maps student profile when Supabase write succeeds", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles" || table === "availability" || table === "user_skills") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === "skills") {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "sk_db_1" } }),
              }),
            }),
          };
        }
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    } as any;

    vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

    const profile = await ProfileService.completeOnboarding(
      "usr_123",
      "test@stanford.edu",
      mockOnboardingData
    );

    expect(profile).toBeDefined();
    expect(profile.id).toBe("usr_123");
    expect(profile.fullName).toBe("Alex Chen");
    expect(profile.college).toBe("Stanford University");
    expect(profile.skills.length).toBe(2);
    expect(profile.availabilityStatus).toBe("AVAILABLE");
  });

  it("rejects non-image file uploads in uploadAndSaveAvatar", async () => {
    const invalidFile = new File(["not-an-image"], "document.pdf", {
      type: "application/pdf",
    });

    const res = await ProfileService.uploadAndSaveAvatar("usr_123", invalidFile);
    expect(res.error).toBe("File must be an image (JPEG, PNG, WEBP, GIF).");
  });

  it("rejects files larger than 5MB in uploadAndSaveAvatar", async () => {
    const largeBlob = new Uint8Array(6 * 1024 * 1024);
    const oversizedFile = new File([largeBlob], "huge_avatar.png", {
      type: "image/png",
    });

    const res = await ProfileService.uploadAndSaveAvatar("usr_123", oversizedFile);
    expect(res.error).toBe("Image size must be less than 5MB.");
  });
});
