import { Conversation, ChatMessage, ConversationMember } from "@/types/chat";
import { StudentProfile } from "@/types/user";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_STUDENTS, CURRENT_USER } from "@/lib/mock-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_CONVERSATIONS_KEY = "caca_user_conversations";
const LOCAL_MESSAGES_PREFIX = "caca_chat_msgs_";

export class ChatService {
  /**
   * Get all active conversations for the specified user
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

    return Array.from(combinedMap.values()).sort(
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

    // 1. Local Storage persistence
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

    // 2. Supabase persistence
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: text,
        });
      } catch (err) {
        // Fall back gracefully
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
    const convId = `conv_${Date.now()}`;

    const newConv: Conversation = {
      id: convId,
      name: targetStudent?.fullName || "Student",
      isGroup: false,
      members: [
        { conversationId: convId, userId, joinedAt: new Date().toISOString() },
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
    const convId = `conv_grp_${Date.now()}`;
    const allMembers: ConversationMember[] = [
      { conversationId: convId, userId: creatorId, joinedAt: new Date().toISOString() },
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
}
