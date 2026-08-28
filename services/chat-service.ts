import { Conversation, ChatMessage, ConversationMember } from "@/types/chat";
import { StudentProfile } from "@/types/user";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_STUDENTS } from "@/lib/mock-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const LOCAL_CONVERSATIONS_KEY = "caca_user_conversations";
const LOCAL_MESSAGES_PREFIX = "caca_chat_msgs_";
const LOCAL_HIDDEN_CONVS_PREFIX = "caca_hidden_convs_";
const LOCAL_STORAGE_DEMO_KEY = "caca_is_demo_mode";

export class ChatService {
  /**
   * Helper to check if running in Demo Mode
   */
  private static checkIsDemo(isDemoParam?: boolean): boolean {
    if (typeof isDemoParam === "boolean") return isDemoParam;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem(LOCAL_STORAGE_DEMO_KEY) === "true" &&
        document.cookie.includes("caca_demo_mode=true")
      );
    }
    return false;
  }

  /**
   * Get all active conversations for the specified user with resolved real participant identities
   */
  static async getConversations(userId: string, isDemoMode?: boolean): Promise<Conversation[]> {
    if (!userId) return [];

    const isDemo = this.checkIsDemo(isDemoMode);

    // 1. Get user-specific hidden/deleted conversation IDs
    const hiddenIds = new Set<string>();
    if (typeof window !== "undefined") {
      try {
        const storedHidden = localStorage.getItem(`${LOCAL_HIDDEN_CONVS_PREFIX}${userId}`);
        if (storedHidden) {
          (JSON.parse(storedHidden) as string[]).forEach((id) => hiddenIds.add(id));
        }
      } catch (err) {
        console.error("ChatService.getConversations hidden parsing error:", err);
      }
    }

    const combinedMap = new Map<string, Conversation>();

    // 2. In Demo Mode, unconfigured offline, or mock user IDs, seed with matching mock conversations
    if (isDemo || !isSupabaseConfigured() || userId.startsWith("usr_")) {
      for (const c of MOCK_CONVERSATIONS) {
        const isMember = c.members.some(
          (m) =>
            m.userId === userId ||
            (userId === "usr_01" && m.userId === "usr_curr_01") ||
            (userId === "usr_curr_01" && m.userId === "usr_01")
        );
        if (isMember && !hiddenIds.has(c.id)) {
          combinedMap.set(c.id, c);
        }
      }
    }

    // 3. Load locally cached conversations where this user is a member
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        if (stored) {
          const list: Conversation[] = JSON.parse(stored);
          list.forEach((c) => {
            if (
              !hiddenIds.has(c.id) &&
              c.members.some(
                (m) =>
                  m.userId === userId ||
                  (userId === "usr_01" && m.userId === "usr_curr_01") ||
                  (userId === "usr_curr_01" && m.userId === "usr_01")
              )
            ) {
              combinedMap.set(c.id, c);
            }
          });
        }
      } catch (err) {
        console.error("ChatService.getConversations local parse error:", err);
      }
    }

    // 4. Supabase Remote Conversations with Real Profiles Join
    if (isSupabaseConfigured() && !isDemo) {
      try {
        const supabase = createClient();

        // Query conversation memberships where current user is not hidden
        const { data: memberRows, error } = await supabase
          .from("conversation_members")
          .select("conversation_id, is_hidden, conversations(*)")
          .eq("user_id", userId);

        if (error) {
          console.error("ChatService.getConversations query error:", error);
        } else if (memberRows && memberRows.length > 0) {
          // Filter out rows marked is_hidden = true
          const activeMemberRows = memberRows.filter(
            (r: any) => !r.is_hidden && !hiddenIds.has(r.conversation_id)
          );

          for (const row of activeMemberRows) {
            const conv = (row as any).conversations;
            if (conv && !hiddenIds.has(conv.id)) {
              // Fetch all members of this conversation
              const { data: allMembers, error: membersErr } = await supabase
                .from("conversation_members")
                .select("user_id, joined_at, is_hidden")
                .eq("conversation_id", conv.id);

              if (membersErr) {
                console.error("ChatService.getConversations members query error:", membersErr);
              }

              const memberList = (allMembers || []).filter((m: any) => !m.is_hidden);
              const memberUserIds = memberList.map((m: any) => m.user_id);

              // Bulk fetch real student profiles for all members
              let profilesMap = new Map<string, any>();
              if (memberUserIds.length > 0) {
                const { data: profilesData } = await supabase
                  .from("profiles")
                  .select("id, full_name, avatar_url, college, major, headline, experience_level, working_style")
                  .in("id", memberUserIds);

                if (profilesData) {
                  profilesData.forEach((p) => profilesMap.set(p.id, p));
                }
              }

              // Construct populated members with real profile details
              const members: ConversationMember[] = memberList.map((m: any) => {
                const realProf = profilesMap.get(m.user_id);
                const mockMatch = MOCK_STUDENTS.find((s) => s.id === m.user_id);

                const userObj: StudentProfile | undefined = realProf
                  ? {
                      id: realProf.id,
                      email: "",
                      fullName: realProf.full_name || "Student",
                      college: realProf.college || "Campus University",
                      major: realProf.major || "General Studies",
                      gradYear: 2026,
                      experienceLevel: realProf.experience_level || "junior",
                      workingStyle: realProf.working_style || "collaborative",
                      headline: realProf.headline || undefined,
                      avatarUrl: realProf.avatar_url || undefined,
                      skills: [],
                      interests: [],
                      availability: {
                        hoursPerWeek: 10,
                        timezone: "UTC",
                        prefersRemote: true,
                        weekendAvailability: true,
                        weekdayEvenings: true,
                      },
                    }
                  : mockMatch;

                return {
                  conversationId: conv.id,
                  userId: m.user_id,
                  user: userObj,
                  joinedAt: m.joined_at,
                };
              });

              // Query last message in conversation
              const { data: lastMsgData } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conv.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              // Derive appropriate title: For 1-on-1, other participant's real name
              let convTitle = conv.name;
              if (!conv.is_group) {
                const other = members.find((m) => m.userId !== userId) || members[0];
                if (other?.user?.fullName) {
                  convTitle = other.user.fullName;
                }
              }

              combinedMap.set(conv.id, {
                id: conv.id,
                name: convTitle || (conv.is_group ? "Squad Group" : "Direct Conversation"),
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
        console.error("ChatService.getConversations database error:", err);
      }
    }

    // 5. Final resolution and sorting
    const populated = Array.from(combinedMap.values()).map((c) => {
      const updatedMembers = c.members.map((m) => {
        if (!m.user) {
          const student = MOCK_STUDENTS.find((s) => s.id === m.userId);
          if (student) return { ...m, user: student };
        }
        return m;
      });

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
        name: convName || (c.isGroup ? "Squad Group" : "Direct Conversation"),
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
   * Send a chat message with verified Supabase persistence and real error propagation
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
    const text = content.trim();
    if (!text) return { success: false, error: "Message cannot be empty." };

    const isDemo = this.checkIsDemo(isDemoMode);

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      content: text,
      createdAt: new Date().toISOString(),
    };

    // 1. Supabase Persistence for Real Users
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
          .select("id, conversation_id, sender_id, content, created_at")
          .maybeSingle();

        if (error) {
          console.error("ChatService.sendMessage Supabase insert error:", {
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
            conversationId,
            senderId,
          });
          return {
            success: false,
            error: "Couldn't send message — please try again.",
          };
        }

        if (!data?.id) {
          console.error("ChatService.sendMessage: No message row returned after insert");
          return {
            success: false,
            error: "Database did not confirm message delivery.",
          };
        }

        newMsg.id = data.id;
        newMsg.createdAt = data.created_at || newMsg.createdAt;
      } catch (err) {
        console.error("ChatService.sendMessage unhandled exception:", err);
        return {
          success: false,
          error: "Network error sending message. Please try again.",
        };
      }
    }

    // 2. Local Storage cache update ONLY upon verified success
    if (typeof window !== "undefined") {
      try {
        const key = `${LOCAL_MESSAGES_PREFIX}${conversationId}`;
        const stored = localStorage.getItem(key);
        const list: ChatMessage[] = stored ? JSON.parse(stored) : [];
        if (!list.some((m) => m.id === newMsg.id)) {
          localStorage.setItem(key, JSON.stringify([...list, newMsg]));
        }

        // Update lastMessage on conversation in local cache
        const convStored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const convList: Conversation[] = convStored ? JSON.parse(convStored) : [];
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
   * Create or find a 1-to-1 direct conversation with another student.
   * Strictly verifies that User A and User B share the exact same conversation ID.
   */
  static async createDirectConversation(
    userId: string,
    targetUserId: string,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    if (!userId || !targetUserId) {
      return { success: false, error: "Missing user IDs for conversation." };
    }

    if (userId === targetUserId) {
      return { success: false, error: "Cannot create conversation with yourself." };
    }

    const isDemo = this.checkIsDemo(isDemoMode);

    // 1. Check local/memory active conversations first
    const all = await this.getConversations(userId, isDemo);
    const existingLocal = all.find(
      (c) =>
        !c.isGroup &&
        c.members.some((m) => m.userId === userId) &&
        c.members.some((m) => m.userId === targetUserId)
    );

    if (existingLocal) {
      return { success: true, conversation: existingLocal };
    }

    let targetProfile: StudentProfile | undefined = MOCK_STUDENTS.find((s) => s.id === targetUserId);
    let userProfile: StudentProfile | undefined = MOCK_STUDENTS.find((s) => s.id === userId);

    let convId = `conv_${Date.now()}`;

    // 2. Supabase Check & Persistence for Real Users
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();

        // 2a. First, check Supabase directly if a 1-to-1 conversation already exists between BOTH users
        const { data: userMemberships, error: userMembErr } = await supabase
          .from("conversation_members")
          .select("conversation_id, conversations!inner(id, is_group, name, created_at, updated_at)")
          .eq("user_id", userId)
          .eq("conversations.is_group", false);

        if (!userMembErr && userMemberships && userMemberships.length > 0) {
          const candidateConvIds = userMemberships.map((r: any) => r.conversation_id);

          const { data: matchedTarget, error: matchedErr } = await supabase
            .from("conversation_members")
            .select("conversation_id, conversations(*)")
            .in("conversation_id", candidateConvIds)
            .eq("user_id", targetUserId)
            .limit(1)
            .maybeSingle();

          if (!matchedErr && matchedTarget?.conversation_id) {
            const existingDbConv = (matchedTarget as any).conversations;
            const fullConvs = await this.getConversations(userId, isDemo);
            const found = fullConvs.find((c) => c.id === existingDbConv?.id || c.id === matchedTarget.conversation_id);
            if (found) {
              return { success: true, conversation: found };
            }

            return {
              success: true,
              conversation: {
                id: matchedTarget.conversation_id,
                name: existingDbConv?.name || targetProfile?.fullName || "Direct Conversation",
                isGroup: false,
                members: [
                  {
                    conversationId: matchedTarget.conversation_id,
                    userId,
                    user: userProfile,
                    joinedAt: new Date().toISOString(),
                  },
                  {
                    conversationId: matchedTarget.conversation_id,
                    userId: targetUserId,
                    user: targetProfile,
                    joinedAt: new Date().toISOString(),
                  },
                ],
                createdAt: existingDbConv?.created_at || new Date().toISOString(),
                updatedAt: existingDbConv?.updated_at || new Date().toISOString(),
                unreadCount: 0,
              },
            };
          }
        }

        // 2b. Fetch real profiles of both users for title & member records
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, major, college, headline")
          .in("id", [userId, targetUserId]);

        if (profs) {
          const tp = profs.find((p) => p.id === targetUserId);
          const up = profs.find((p) => p.id === userId);

          if (tp) {
            targetProfile = {
              id: tp.id,
              email: "",
              fullName: tp.full_name || "Student",
              college: tp.college || "Campus University",
              major: tp.major || "General Studies",
              gradYear: 2026,
              experienceLevel: "junior",
              workingStyle: "collaborative",
              headline: tp.headline || undefined,
              avatarUrl: tp.avatar_url || undefined,
              skills: [],
              interests: [],
              availability: { hoursPerWeek: 10, timezone: "UTC", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
            };
          }

          if (up) {
            userProfile = {
              id: up.id,
              email: "",
              fullName: up.full_name || "Student",
              college: up.college || "Campus University",
              major: up.major || "General Studies",
              gradYear: 2026,
              experienceLevel: "junior",
              workingStyle: "collaborative",
              headline: up.headline || undefined,
              avatarUrl: up.avatar_url || undefined,
              skills: [],
              interests: [],
              availability: { hoursPerWeek: 10, timezone: "UTC", prefersRemote: true, weekendAvailability: true, weekdayEvenings: true },
            };
          }
        }

        const directConvName = targetProfile?.fullName || "Direct Conversation";

        // 2c. Create the conversation record in Supabase
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .insert({
            name: directConvName,
            is_group: false,
            created_by: userId,
          })
          .select("id, created_at, updated_at")
          .maybeSingle();

        if (convError) {
          console.error("ChatService.createDirectConversation insert error:", convError);
          return { success: false, error: "Failed to initialize conversation in database." };
        }

        if (!convData?.id) {
          return { success: false, error: "Failed to retrieve conversation ID from database." };
        }

        convId = convData.id;

        // 2d. Enroll BOTH participants in conversation_members
        const { error: membersError } = await supabase
          .from("conversation_members")
          .insert([
            { conversation_id: convData.id, user_id: userId },
            { conversation_id: convData.id, user_id: targetUserId },
          ]);

        if (membersError) {
          console.error("ChatService.createDirectConversation members insert error:", membersError);
          return { success: false, error: "Failed to enroll conversation members in database." };
        }
      } catch (err) {
        console.error("ChatService.createDirectConversation exception:", err);
        return { success: false, error: "Network error creating conversation." };
      }
    }

    const newConv: Conversation = {
      id: convId,
      name: targetProfile?.fullName || "Direct Conversation",
      isGroup: false,
      members: [
        {
          conversationId: convId,
          userId,
          user: userProfile,
          joinedAt: new Date().toISOString(),
        },
        {
          conversationId: convId,
          userId: targetUserId,
          user: targetProfile,
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      unreadCount: 0,
    };

    // 3. Local Storage cache update
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const list: Conversation[] = stored ? JSON.parse(stored) : [];
        if (!list.some((c) => c.id === newConv.id)) {
          localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([newConv, ...list]));
        }
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
    isDemoMode?: boolean
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    const isDemo = this.checkIsDemo(isDemoMode);
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
          return { success: false, error: "Failed to create group in database." };
        }

        if (convData?.id) {
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
            return { success: false, error: "Failed to enroll group members in database." };
          }
        }
      } catch (err) {
        console.error("ChatService.createGroupConversation exception:", err);
        return { success: false, error: "Network error creating group conversation." };
      }
    }

    // 2. Local Storage persistence
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
        const list: Conversation[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify([newGroup, ...list]));
      } catch (err) {
        console.warn("Could not save new group conversation locally:", err);
      }
    }

    return { success: true, conversation: newGroup };
  }

  /**
   * Delete / Hide a conversation per user.
   * Ensures User A deleting the chat removes it from User A's view while User B retains access.
   */
  static async deleteConversation(
    conversationId: string,
    userId: string,
    isDemoMode?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (!conversationId || !userId) {
      return { success: false, error: "Missing conversation ID or user ID." };
    }

    const isDemo = this.checkIsDemo(isDemoMode);

    // 1. Supabase: Mark conversation_members as is_hidden = true for this user
    if (!isDemo && isSupabaseConfigured()) {
      try {
        const supabase = createClient();

        // Mark user's membership row as hidden
        const { error: hideError } = await supabase
          .from("conversation_members")
          .update({
            is_hidden: true,
            deleted_at: new Date().toISOString(),
          } as any)
          .eq("conversation_id", conversationId)
          .eq("user_id", userId);

        if (hideError) {
          console.warn("Could not update is_hidden, falling back to delete membership:", hideError);
          // Fallback to removing membership row
          await supabase
            .from("conversation_members")
            .delete()
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);
        }
      } catch (err) {
        console.error("ChatService.deleteConversation database error:", err);
      }
    }

    // 2. Local Storage cache update (Record in user's hidden conversations list)
    if (typeof window !== "undefined") {
      try {
        const hiddenKey = `${LOCAL_HIDDEN_CONVS_PREFIX}${userId}`;
        const storedHidden = localStorage.getItem(hiddenKey);
        const hiddenList: string[] = storedHidden ? JSON.parse(storedHidden) : [];
        if (!hiddenList.includes(conversationId)) {
          hiddenList.push(conversationId);
          localStorage.setItem(hiddenKey, JSON.stringify(hiddenList));
        }

        localStorage.removeItem(`${LOCAL_MESSAGES_PREFIX}${conversationId}`);
      } catch (err) {
        console.warn("Could not update local storage on delete:", err);
      }
    }

    return { success: true };
  }
}
