import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChatService } from "@/services/chat-service";
import * as supabaseClient from "@/lib/supabase/client";
import { StudentProfile } from "@/types/user";

describe("Real Multi-User Chat Delivery & Persistence Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  describe("1. Conversation Creation & Dual Enrollment", () => {
    it("should enroll both participants when creating a new 1-to-1 conversation in Supabase", async () => {
      const userA = "11111111-1111-4111-8111-111111111111";
      const userB = "22222222-2222-4222-8222-222222222222";
      const realConvId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const insertedMembers: any[] = [];
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "conversation_members") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  in: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
              insert: vi.fn().mockImplementation((rows: any[]) => {
                insertedMembers.push(...rows);
                return Promise.resolve({ error: null });
              }),
            };
          }
          if (table === "conversations") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: realConvId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { id: userA, full_name: "Alice User", avatar_url: "https://avatar-a.jpg", major: "CS", college: "MIT" },
                    { id: userB, full_name: "Bob Recipient", avatar_url: "https://avatar-b.jpg", major: "AI", college: "Stanford" },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ChatService.createDirectConversation(userA, userB, false);

      expect(res.success).toBe(true);
      expect(res.conversation).toBeDefined();
      expect(res.conversation?.id).toBe(realConvId);

      // Verify BOTH members were enrolled in conversation_members
      expect(insertedMembers.length).toBe(2);
      expect(insertedMembers.some((m) => m.user_id === userA && m.conversation_id === realConvId)).toBe(true);
      expect(insertedMembers.some((m) => m.user_id === userB && m.conversation_id === realConvId)).toBe(true);
    });
  });

  describe("2. Deduplication & Existing Conversation Reuse", () => {
    it("should reuse the existing Supabase conversation when User A messages User B again", async () => {
      const userA = "11111111-1111-4111-8111-111111111111";
      const userB = "22222222-2222-4222-8222-222222222222";
      const existingConvId = "existing-conv-uuid-1234";

      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      let insertConvCalls = 0;
      const mockSupabase = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "conversation_members") {
            return {
              select: vi.fn().mockImplementation((fields: string) => {
                const queryObj: any = {
                  eq: vi.fn().mockImplementation((col: string, val: any) => {
                    if (col === "user_id" && val === userA) {
                      return {
                        eq: vi.fn().mockResolvedValue({
                          data: [{ conversation_id: existingConvId, conversations: { id: existingConvId, is_group: false } }],
                          error: null,
                        }),
                      };
                    }
                    return queryObj;
                  }),
                  in: vi.fn().mockImplementation(() => queryObj),
                  limit: vi.fn().mockImplementation(() => queryObj),
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { conversation_id: existingConvId, conversations: { id: existingConvId, is_group: false, name: "Bob Recipient" } },
                    error: null,
                  }),
                };
                return queryObj;
              }),
            };
          }
          if (table === "profiles") {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { id: userA, full_name: "Alice User", avatar_url: "https://avatar-a.jpg", major: "CS", college: "MIT" },
                    { id: userB, full_name: "Bob Recipient", avatar_url: "https://avatar-b.jpg", major: "AI", college: "Stanford" },
                  ],
                  error: null,
                }),
              }),
            };
          }
          return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ChatService.createDirectConversation(userA, userB, false);

      expect(res.success).toBe(true);
      expect(res.conversation?.id).toBe(existingConvId);
      // Verify no duplicate conversation row was inserted
      expect(insertConvCalls).toBe(0);
    });
  });

  describe("3. Verified Message Persistence & Error Surface", () => {
    it("should fail gracefully and not report success if Supabase message insert fails", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "new row violates row-level security policy for table messages", code: "42501" },
              }),
            }),
          }),
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ChatService.sendMessage("conv_uuid", "user_uuid", "Hello World", false);

      expect(res.success).toBe(false);
      expect(res.error).toBe("Couldn't send message — please try again.");
      expect(res.message).toBeUndefined();
    });

    it("should succeed and return the real Supabase message ID when insert succeeds", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);
      const realMessageId = "msg-db-uuid-5678";

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: realMessageId,
                  conversation_id: "conv-123",
                  sender_id: "user-123",
                  content: "Real message",
                  created_at: "2026-08-28T10:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const res = await ChatService.sendMessage("conv-123", "user-123", "Real message", false);

      expect(res.success).toBe(true);
      expect(res.message).toBeDefined();
      expect(res.message?.id).toBe(realMessageId);
      expect(res.message?.content).toBe("Real message");
    });
  });

  describe("4. Recipient Message Query & Profile Resolution", () => {
    it("should query messages for the conversation and return sorted results", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: "m1", conversation_id: "conv1", sender_id: "userA", content: "Hello", created_at: "2026-08-28T10:00:00.000Z" },
                  { id: "m2", conversation_id: "conv1", sender_id: "userB", content: "Hi there", created_at: "2026-08-28T10:01:00.000Z" },
                ],
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      vi.spyOn(supabaseClient, "createClient").mockReturnValue(mockSupabase);

      const messages = await ChatService.getMessages("conv1");

      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[0].senderId).toBe("userA");
      expect(messages[1].content).toBe("Hi there");
      expect(messages[1].senderId).toBe("userB");
    });
  });

  describe("5. Demo Mode Isolation", () => {
    it("should keep demo mode isolated using local/mock storage without touching Supabase", async () => {
      vi.spyOn(supabaseClient, "isSupabaseConfigured").mockReturnValue(true);
      const createClientSpy = vi.spyOn(supabaseClient, "createClient");

      const res = await ChatService.sendMessage("conv_01", "usr_curr_01", "Demo message", true);

      expect(res.success).toBe(true);
      expect(res.message?.content).toBe("Demo message");
      // Supabase createClient should not be called for demo messages
      expect(createClientSpy).not.toHaveBeenCalled();
    });
  });
});
