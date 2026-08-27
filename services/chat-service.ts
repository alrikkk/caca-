import { Conversation, ChatMessage, ConversationMember } from "@/types/chat";
import { StudentProfile } from "@/types/user";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_STUDENTS } from "@/lib/mock-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_CONVERSATIONS_KEY = "caca_user_conversations";
const LOCAL_MESSAGES_PREFIX = "caca_chat_msgs_";

export class ChatService {
  /**
   * Get all active conversations for the specified user with resolved participant identities
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    let localConvs: Conversation[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        if (stored) {
          localConvs = JSON.parse(stored);
        }
      } catch (err) {
        localConvs = [];
      }
    }

    // Merge mock conversations and locally created ones
    const combinedMap = new Map<string, Conversation>();
    for (const c of MOCK_CONVERSATIONS) {
      combinedMap.set(c.id, c);
    }
    for (const c of localConvs) {
      combinedMap.set(c.id, c);
    }

    // Supabase remote conversations
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: memberRows, error } = await supabase
          .from("conversation_members")
          .select("conversation_id, conversations(*)")
          .eq("user_id", userId);

        if (error) {
          console.error("ChatService.getConversations query error:", error);
        } else if (memberRows) {
          for (const row of memberRows) {
            const conv = row.conversations;
            if (conv && !combinedMap.has(conv.id)) {
              const { data: allMembers, error: membersErr } = await supabase
                .from("conversation_members")
                .select("user_id, joined_at, profiles(*)")
                .eq("conversation_id", conv.id);

              if (membersErr) {
                console.error("ChatService.getConversations members query error:", membersErr);
              }

              const members: ConversationMember[] = (allMembers || []).map((m: any) => ({
                conversationId: conv.id,
                userId: m.user_id,
                user: m.profiles
                  ? {
                      id: m.profiles.id,
                      email: m.profiles.email || `${m.user_id}@campus.edu`,
                      fullName: m.profiles.full_name || "Student",
                      college: m.profiles.college || "Campus University",
                      major: m.profiles.major || "Computer Science",
                      gradYear: m.profiles.grad_year || 2026,
                      experienceLevel: (m.profiles.experience_level as any) || "junior",
                      workingStyle: (m.profiles.working_style as any) || "collaborative",
                      headline: m.profiles.headline || undefined,
                      avatarUrl: m.profiles.avatar_url || undefined,
                      skills: m.profiles.skills || [],
                      interests: [],
                      availability: {
                        hoursPerWeek: 10,
                        timezone: "EST",
                        prefersRemote: true,
                        weekendAvailability: true,
                        weekdayEvenings: true,
                      },
                    }
                  : MOCK_STUDENTS.find((s) => s.id === m.user_id),
                joinedAt: m.joined_at,
              }));

              const { data: lastMsgData } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              combinedMap.set(conv.id, {
                id: conv.id,
                name: conv.name || undefined,
                isGroup: Boolean(conv.is_group),
                members,
                lastMessage: lastMsgData
                  ? {
                      id: lastMsgData.id,
                      conversationId: lastMsgData.conversation_id,
                      senderId: lastMsgData.sender_id,
                      content: lastMsgData.content,
                      createdAt: lastMsgData.created_at,
                    }
                  : undefined,
                createdAt: conv.created_at,
                updatedAt: conv.updated_at,
                unreadCount: 0,
              });
            }
          }
        }
      } catch (err) {
        console.error("ChatService.getConversations exception:", err);
      }
    }

    const populated = Array.from(combinedMap.values()).map((c) => {
      const updatedMembers = c.members.map((m) => {
        if (!m.user) {
          const student = MOCK_STUDENTS.find((s) => s.id === m.userId);
          if (student) return { ...m, user: student };
        }
        return m;
      });

      // For 1-on-1 direct conversations, name should be the other participant
      let convName = c.name;
      if (!c.isGroup) {
        const otherMember = updatedMembers.find((m) => m.userId !== userId) || updatedMembers[0];
        if (otherMember?.user?.fullName) {
          convName = otherMember.user.fullName;
        } else if (otherMember?.userId) {
          const matched = MOCK_STUDENTS.find((s) => s.id === otherMember.userId);
          if (matched) convName = matched.fullName;
        }
      }

      return {
        ...c,
        name: convName,
        members: updatedMembers,
      };
    });

    return populated.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get messages for a specific conversation
   */
  static async getMessages(conversationId: string): Promise<ChatMessage[]> {
    let localMsgs: ChatMessage[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
        if (stored) {
          localMsgs = JSON.parse(stored);
        }
      } catch (err) {
        localMsgs = [];
      }
    }

    const mockMsgs = MOCK_MESSAGES[conversationId] || [];
    const combinedMap = new Map<string, ChatMessage>();

    for (const m of mockMsgs) {
      combinedMap.set(m.id, m);
    }
    for (const m of localMsgs) {
      combinedMap.set(m.id, m);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("ChatService.getMessages query error:", error);
        } else if (data) {
          for (const m of data) {
            combinedMap.set(m.id, {
              id: m.id,
              conversationId: m.conversation_id,
              senderId: m.sender_id,
              content: m.content,
              createdAt: m.created_at,
            });
          }
        }
      } catch (err) {
        console.error("ChatService.getMessages exception:", err);
      }
    }

    return Array.from(combinedMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Send a chat message
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    isDemo: boolean = false
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    const text = content.trim();
    if (!text) return { success: false, error: "Message cannot be empty." };

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId,
      content: text,
      createdAt: new Date().toISOString(),
    };

    // 1. Supabase persistence
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            content: text,
          })
          .select("id, created_at")
          .maybeSingle();

        if (error) {
          console.error("ChatService.sendMessage insert error:", error);
        } else if (data?.id) {
          newMsg.id = data.id;
          if (data.created_at) newMsg.createdAt = data.created_at;
        }
      } catch (err) {
        console.error("ChatService.sendMessage exception:", err);
      }
    }

    // 2. Local Storage persistence
    if (typeof window !== "undefined") {
      try {
        const key = `${LOCAL_MESSAGES_PREFIX}${conversationId}`;
        const stored = localStorage.getItem(key);
        const list: ChatMessage[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem(key, JSON.stringify([...list, newMsg]));

        // Update lastMessage on conversation
        const convStored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const convList: Conversation[] = convStored ? JSON.parse(convStored) : [...MOCK_CONVERSATIONS];
        const updated = convList.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt }
            : c
        );
        localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn("Could not save message locally:", err);
      }
    }

    return { success: true, message: newMsg };
  }

  /**
   * Create or find a 1-to-1 direct conversation with another student
   */
  static async createDirectConversation(
    userId: string,
    targetUserId: string,
    isDemo: boolean = false
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    if (userId === targetUserId) {
      return { success: false, error: "Cannot create conversation with yourself." };
    }

    const all = await this.getConversations(userId);
    const existing = all.find(
      (c) =>
        !c.isGroup &&
        c.members.some((m) => m.userId === targetUserId)
    );

    if (existing) {
      return { success: true, conversation: existing };
    }

    const targetStudent = MOCK_STUDENTS.find((s) => s.id === targetUserId);
    let convId = `conv_${Date.now()}`;

    const newConv: Conversation = {
      id: convId,
      name: targetStudent?.fullName || "Student",
      isGroup: false,
      members: [
        {
          conversationId: convId,
          userId,
          user: MOCK_STUDENTS.find((s) => s.id === userId),
          joinedAt: new Date().toISOString(),
        },
        {
          conversationId: convId,
          userId: targetUserId,
          user: targetStudent,
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
    };

    // 1. Supabase persistence
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({
            name: targetStudent?.fullName || "Direct Conversation",
            is_group: false,
            created_by: userId,
          })
          .select("id, created_at, updated_at")
          .maybeSingle();

        if (convError) {
          console.error("ChatService.createDirectConversation insert error:", convError);
        } else if (convData?.id) {
          convId = convData.id;
          newConv.id = convData.id;
          newConv.createdAt = convData.created_at || newConv.createdAt;
          newConv.updatedAt = convData.updated_at || newConv.updatedAt;
          newConv.members = [
            {
              conversationId: convData.id,
              userId,
              user: MOCK_STUDENTS.find((s) => s.id === userId),
              joinedAt: new Date().toISOString(),
            },
            {
              conversationId: convData.id,
              userId: targetUserId,
              user: targetStudent,
              joinedAt: new Date().toISOString(),
            },
          ];

          const { error: membersError } = await supabase
            .from("conversation_members")
            .insert([
              { conversation_id: convData.id, user_id: userId },
              { conversation_id: convData.id, user_id: targetUserId },
            ]);

          if (membersError) {
            console.error("ChatService.createDirectConversation members error:", membersError);
          }
        }
      } catch (err) {
        console.error("ChatService.createDirectConversation exception:", err);
      }
    }

    // 2. Local Storage persistence
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const list: Conversation[] = stored ? JSON.parse(stored) : [...MOCK_CONVERSATIONS];
        localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([newConv, ...list]));
      } catch (err) {
        console.warn("Could not save new conversation locally:", err);
      }
    }

    return { success: true, conversation: newConv };
  }

  /**
   * Create a group conversation
   */
  static async createGroupConversation(
    creatorId: string,
    name: string,
    memberIds: string[],
    isDemo: boolean = false
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    let convId = `conv_grp_${Date.now()}`;
    const allMembers: ConversationMember[] = [
      {
        conversationId: convId,
        userId: creatorId,
        user: MOCK_STUDENTS.find((s) => s.id === creatorId),
        joinedAt: new Date().toISOString(),
      },
      ...memberIds.map((id) => ({
        conversationId: convId,
        userId: id,
        user: MOCK_STUDENTS.find((s) => s.id === id),
        joinedAt: new Date().toISOString(),
      })),
    ];

    const newGroup: Conversation = {
      id: convId,
      name: name.trim() || "Squad Group",
      isGroup: true,
      members: allMembers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
    };

    // 1. Supabase persistence
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({
            name: name.trim() || "Squad Group",
            is_group: true,
            created_by: creatorId,
          })
          .select("id, created_at, updated_at")
          .maybeSingle();

        if (convError) {
          console.error("ChatService.createGroupConversation insert error:", convError);
        } else if (convData?.id) {
          convId = convData.id;
          newGroup.id = convData.id;
          newGroup.createdAt = convData.created_at || newGroup.createdAt;
          newGroup.updatedAt = convData.updated_at || newGroup.updatedAt;
          newGroup.members.forEach((m) => (m.conversationId = convData.id));

          const memberInserts = [creatorId, ...memberIds].map((uid) => ({
            conversation_id: convData.id,
            user_id: uid,
          }));

          const { error: membersError } = await supabase
            .from("conversation_members")
            .insert(memberInserts);

          if (membersError) {
            console.error("ChatService.createGroupConversation members error:", membersError);
          }
        }
      } catch (err) {
        console.error("ChatService.createGroupConversation exception:", err);
      }
    }

    // 2. Local Storage persistence
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const list: Conversation[] = stored ? JSON.parse(stored) : [...MOCK_CONVERSATIONS];
        localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([newGroup, ...list]));
      } catch (err) {
        console.warn("Could not save new group conversation locally:", err);
      }
    }

    return { success: true, conversation: newGroup };
  }

  /**
   * Delete or leave a conversation
   * For conversations created by the user or 1-to-1 direct chats, deletes the conversation.
   * For group chats where the user is a member, removes the user membership without destroying the group for others.
   */
  static async deleteConversation(
    conversationId: string,
    userId: string,
    isDemo: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    if (!conversationId || !userId) {
      return { success: false, error: "Missing conversation ID or user ID." };
    }

    // 1. Supabase deletion
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();

        // First attempt to delete conversation if current user is creator
        const { error: convDeleteError } = await supabase
          .from("conversations")
          .delete()
          .eq("id", conversationId)
          .eq("created_by", userId);

        if (convDeleteError) {
          // If not creator or RLS prevents deleting entire group, remove user from conversation members
          const { error: memberDeleteError } = await supabase
            .from("conversation_members")
            .delete()
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);

          if (memberDeleteError) {
            console.error("ChatService.deleteConversation membership error:", memberDeleteError);
            return { success: false, error: memberDeleteError.message || "Failed to delete conversation." };
          }
        }
      } catch (err) {
        console.error("ChatService.deleteConversation exception:", err);
      }
    }

    // 2. Local Storage cache update
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        if (stored) {
          const list: Conversation[] = JSON.parse(stored);
          const updated = list.filter((c) => c.id !== conversationId);
          localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(updated));
        }
        localStorage.removeItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
      } catch (err) {
        console.warn("Could not remove conversation locally:", err);
      }
    }

    return { success: true };
  }
}
