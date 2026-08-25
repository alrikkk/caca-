import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamService } from "@/services/team-service";
import { InvitationService } from "@/services/invitation-service";
import * as supabaseClient from "@/lib/supabase/client";

describe("TeamService & InvitationService (UUID Preservation)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("reassigns real Supabase team UUID to created team record upon successful insert", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

    const realTeamUuid = "98765432-abcd-4321-fedc-ba9876543210";
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "teams") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: realTeamUuid },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "team_members") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    } as any;

    vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

    const res = await TeamService.createTeam({
      projectId: "proj_01",
      projectName: "EchoSpatial",
      teamName: "Alpha Squad",
      creatorId: "usr_lead_01",
    });

    expect(res.success).toBe(true);
    expect(res.team).toBeDefined();
    // Must be the real Supabase UUID, not a synthetic team_... string
    expect(res.team?.id).toBe(realTeamUuid);

    // Verify localStorage cache also stored the real UUID
    const stored = JSON.parse(localStorage.getItem("caca_user_teams") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(realTeamUuid);
  });

  it("falls back to synthetic team_... id only when Supabase is not configured", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(false);

    const res = await TeamService.createTeam({
      projectId: "proj_01",
      projectName: "EchoSpatial",
      teamName: "Alpha Squad",
      creatorId: "usr_lead_01",
    });

    expect(res.success).toBe(true);
    expect(res.team).toBeDefined();
    expect(res.team?.id).toMatch(/^team_\d+$/);
  });

  it("sends team invitation using real UUID and handles pending status", async () => {
    vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

    const teamUuid = "98765432-abcd-4321-fedc-ba9876543210";
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "team_invitations") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: mockInsert,
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    } as any;

    vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

    const res = await InvitationService.sendInvitation({
      teamId: teamUuid,
      teamName: "Alpha Squad",
      projectId: "proj_01",
      projectName: "EchoSpatial",
      inviterId: "usr_lead_01",
      inviterName: "Alex Chen",
      inviteeId: "usr_cand_02",
      inviteeName: "Maya Patel",
      roleTitle: "ML Specialist",
    });

    expect(res.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: teamUuid,
        invitee_id: "usr_cand_02",
        role_title: "ML Specialist",
        status: "pending",
      })
    );
  });
});
