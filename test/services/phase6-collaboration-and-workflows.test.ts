import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamService } from "@/services/team-service";
import { ApplicationService } from "@/services/application-service";
import { NotificationService } from "@/services/notification-service";
import { AISanitizer } from "@/ai/sanitizer";
import { StudentProfile } from "@/types/user";
import * as supabaseClient from "@/lib/supabase/client";

describe("Phase 6 — Collaboration, Team Workflows & Social Discovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("TeamService Member & Role Management", () => {
    it("allows team lead to update a member's role and rejects non-leads", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "team_members") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockImplementation(() =>
                      // Return is_lead: true for lead, false for non-lead
                      Promise.resolve({ data: { is_lead: true }, error: null })
                    ),
                  }),
                }),
              }),
              update: updateMock,
            };
          }
          return {};
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      // 1. Team lead updates role -> SUCCESS
      const leadResult = await TeamService.updateMemberRole({
        teamId: "team_123",
        userId: "member_456",
        newRoleTitle: "Lead Full-Stack Architect",
        requesterId: "lead_001",
      });

      expect(leadResult.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ role_title: "Lead Full-Stack Architect" });

      // 2. Non-lead attempts update -> REJECTED
      const nonLeadSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "team_members") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { is_lead: false }, error: null }),
                  }),
                }),
              }),
              update: vi.fn(),
            };
          }
          return {};
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(nonLeadSupabase);

      const nonLeadResult = await TeamService.updateMemberRole({
        teamId: "team_123",
        userId: "member_456",
        newRoleTitle: "Hacker",
        requesterId: "random_member_789",
      });

      expect(nonLeadResult.success).toBe(false);
      expect(nonLeadResult.error).toContain("Only team leads can update member roles");
    });

    it("allows team lead to remove member, allows member self-removal, and rejects unauthorized removal", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "team_members") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { is_lead: true }, error: null }),
                  }),
                }),
              }),
              delete: deleteMock,
            };
          }
          return {};
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      // 1. Lead removes member -> SUCCESS
      const leadRemove = await TeamService.removeMemberFromTeam({
        teamId: "team_123",
        userId: "member_456",
        requesterId: "lead_001",
      });
      expect(leadRemove.success).toBe(true);

      // 2. Member removes self -> SUCCESS without lead check
      const selfRemove = await TeamService.removeMemberFromTeam({
        teamId: "team_123",
        userId: "member_456",
        requesterId: "member_456",
      });
      expect(selfRemove.success).toBe(true);
    });
  });

  describe("ApplicationService Workflow & Auto-Enrollment", () => {
    it("submits application with pitch note and retrieves project applications", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(false);

      const res = await ApplicationService.applyToProject(
        "proj_01",
        "usr_applicant_01",
        94,
        "Excited to work on audio algorithms and React interfaces."
      );

      expect(res.success).toBe(true);
      expect(res.application).toBeDefined();
      expect(res.application?.pitchNote).toBe("Excited to work on audio algorithms and React interfaces.");
      expect(res.application?.compatibilityScore).toBe(94);

      // Verify checking application status
      const hasApplied = await ApplicationService.hasApplied("proj_01", "usr_applicant_01");
      expect(hasApplied).toBe(true);

      // Verify fetching submitted applications
      const myApps = await ApplicationService.getMyApplications("usr_applicant_01");
      expect(myApps.length).toBeGreaterThan(0);
      expect(myApps.some((a) => a.applicantId === "usr_applicant_01")).toBe(true);
    });

    it("accepts an applicant, adds them to the team, and notifies them", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const memberUpsertMock = vi.fn().mockResolvedValue({ error: null });
      const notifInsertMock = vi.fn().mockResolvedValue({ error: null });

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "applications") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "app_999",
                      project_id: "00000000-0000-0000-0000-000000000001",
                      applicant_id: "usr_applicant_01",
                      compatibility_score: 95,
                      projects: { title: "EchoSpatial", owner_id: "usr_owner_01" },
                    },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === "teams") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "team_real_uuid" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "team_members") {
            return {
              upsert: memberUpsertMock,
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === "notifications") {
            return {
              insert: notifInsertMock,
            };
          }
          return {};
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ApplicationService.respondToApplication({
        applicationId: "app_999",
        projectId: "proj_01",
        action: "accepted",
        ownerId: "usr_owner_01",
        roleTitle: "Lead Frontend Engineer",
      });

      expect(res.success).toBe(true);
      expect(memberUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: "team_real_uuid",
          user_id: "usr_applicant_01",
          role_title: "Lead Frontend Engineer",
        })
      );
    });

    it("rejects unauthorized user from accepting/rejecting applications", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "applications") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: "app_999",
                      project_id: "00000000-0000-0000-0000-000000000001",
                      applicant_id: "usr_applicant_01",
                      projects: { title: "EchoSpatial", owner_id: "usr_owner_01" },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ApplicationService.respondToApplication({
        applicationId: "app_999",
        projectId: "proj_01",
        action: "accepted",
        ownerId: "hacker_user_999", // NOT project owner
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only the project owner can process applications");
    });
  });

  describe("NotificationService Mark All As Read", () => {
    it("marks all notifications as read in local storage and Supabase", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({
        eq: eqMock,
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      // Setup local cache with unread items
      localStorage.setItem(
        "caca_user_notifications",
        JSON.stringify([
          { id: "n1", userId: "usr_01", title: "Invite", read: false },
          { id: "n2", userId: "usr_01", title: "Accept", read: false },
        ])
      );

      await NotificationService.markAllAsRead("usr_01");

      expect(updateMock).toHaveBeenCalledWith({ read: true });
      expect(eqMock).toHaveBeenCalledWith("user_id", "usr_01");

      const stored = JSON.parse(localStorage.getItem("caca_user_notifications") || "[]");
      expect(stored.every((n: any) => n.read === true)).toBe(true);
    });
  });

  describe("Privacy & Public Profile Safety", () => {
    it("sanitizes candidate data ensuring zero private fields leak to public contexts", () => {
      const studentWithSensitiveData: StudentProfile = {
        id: "usr_test_privacy",
        email: "private_student@university.edu",
        fullName: "Jane Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        college: "Tech Institute",
        major: "Data Science",
        gradYear: 2026,
        experienceLevel: "senior",
        workingStyle: "independent",
        skills: [{ id: "s1", name: "Python", category: "backend", proficiency: 5, verified: true, yearsExperience: 3 }],
        interests: [{ id: "i1", name: "AI Safety", category: "ai" }],
        availability: {
          hoursPerWeek: 15,
          timezone: "UTC",
          prefersRemote: true,
          weekendAvailability: true,
          weekdayEvenings: true,
        },
        linkedinUrl: "https://linkedin.com/in/janedoe",
        githubUrl: "https://github.com/janedoe",
      };

      const sanitized = AISanitizer.sanitizeCandidate(studentWithSensitiveData);

      // Verify public fields are preserved
      expect(sanitized.id).toBe("usr_test_privacy");
      expect(sanitized.fullName).toBe("Jane Doe");
      expect(sanitized.college).toBe("Tech Institute");
      expect(sanitized.skills.length).toBe(1);

      // Verify private fields are stripped
      expect((sanitized as any).email).toBeUndefined();
      expect((sanitized as any).phoneNumber).toBeUndefined();
      expect((sanitized as any).password).toBeUndefined();
      expect((sanitized as any).token).toBeUndefined();
    });
  });
});
