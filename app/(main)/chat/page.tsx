"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ChatService } from "@/services/chat-service";
import { ProfileService } from "@/services/profile-service";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Conversation, ChatMessage } from "@/types/chat";
import { StudentProfile } from "@/types/user";
import { MOCK_STUDENTS, CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import {
  Send,
  Plus,
  Users,
  MessageSquare,
  ExternalLink,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipient");

  const { profile, isDemoMode } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, StudentProfile>>({});

  // New Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Delete Conversation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUserId = profile?.id || CURRENT_USER.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Pre-seed profile lookup map with known mock students and active user
  useEffect(() => {
    const map: Record<string, StudentProfile> = {};
    for (const s of MOCK_STUDENTS) {
      map[s.id] = s;
    }
    if (profile) {
      map[profile.id] = profile;
    }
    setProfilesMap(map);
  }, [profile]);

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      const list = await ChatService.getConversations(activeUserId, isDemoMode);
      setConversations(list);

      // Hydrate profiles map for any member user IDs
      const missingUserIds = new Set<string>();
      const initialKnownMap: Record<string, StudentProfile> = {};

      list.forEach((c) => {
        c.members.forEach((m) => {
          if (m.userId) {
            if (m.user) {
              initialKnownMap[m.userId] = m.user;
            } else {
              missingUserIds.add(m.userId);
            }
          }
        });
      });

      if (missingUserIds.size > 0) {
        await Promise.all(
          Array.from(missingUserIds).map(async (uid) => {
            const p = await ProfileService.getProfileById(uid);
            if (p) initialKnownMap[uid] = p;
          })
        );
      }
      setProfilesMap((prev) => ({ ...prev, ...initialKnownMap }));

      if (recipientId && recipientId !== activeUserId) {
        // Direct conversation with recipient requested (strictly deduplicated)
        const res = await ChatService.createDirectConversation(activeUserId, recipientId, isDemoMode);
        if (res.conversation) {
          setActiveConvId(res.conversation.id);
          const msgs = await ChatService.getMessages(res.conversation.id);
          setMessages(msgs);
          setConversations((prev) => {
            if (!prev.some((c) => c.id === res.conversation?.id)) {
              return [res.conversation!, ...prev];
            }
            return prev;
          });
        }
      } else if (list.length > 0) {
        setActiveConvId(list[0].id);
        const msgs = await ChatService.getMessages(list[0].id);
        setMessages(msgs);
      }
      setLoading(false);
    };

    initChat();
  }, [activeUserId, recipientId, isDemoMode]);

  // Realtime Subscription & Message Polling for Active Conversation
  useEffect(() => {
    if (!activeConvId) return;

    let isMounted = true;

    const loadMsgs = async () => {
      const msgs = await ChatService.getMessages(activeConvId);
      if (!isMounted) return;
      setMessages(msgs);

      // Ensure all sender profiles in messages are resolved
      setProfilesMap((prev) => {
        const missingSenders = msgs.filter((m) => !prev[m.senderId]);
        if (missingSenders.length > 0) {
          Promise.all(
            missingSenders.map(async (m) => {
              const p = await ProfileService.getProfileById(m.senderId);
              if (p && isMounted) {
                setProfilesMap((curr) => ({ ...curr, [m.senderId]: p }));
              }
            })
          );
        }
        return prev;
      });
    };

    loadMsgs();

    // 1. Supabase Realtime Channel
    let realtimeChannel: any = null;
    if (!isDemoMode && isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        realtimeChannel = supabase
          .channel(`chat_room_${activeConvId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${activeConvId}`,
            },
            async (payload: any) => {
              const newRow = payload.new;
              if (newRow && newRow.conversation_id === activeConvId && isMounted) {
                const incoming: ChatMessage = {
                  id: newRow.id,
                  conversationId: newRow.conversation_id,
                  senderId: newRow.sender_id,
                  content: newRow.content,
                  createdAt: newRow.created_at,
                };

                setMessages((prev) => {
                  if (prev.some((m) => m.id === incoming.id)) return prev;
                  return [...prev, incoming];
                });

                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === activeConvId
                      ? { ...c, lastMessage: incoming, updatedAt: incoming.createdAt }
                      : c
                  )
                );

                const senderProfile = await ProfileService.getProfileById(incoming.senderId);
                if (senderProfile && isMounted) {
                  setProfilesMap((curr) => ({ ...curr, [incoming.senderId]: senderProfile }));
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("Could not establish Realtime subscription:", err);
      }
    }

    // 2. Periodic sync polling fallback (every 3.5s)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        ChatService.getMessages(activeConvId).then((latestMsgs) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (
              latestMsgs.length !== prev.length ||
              (latestMsgs.length > 0 &&
                prev.length > 0 &&
                latestMsgs[latestMsgs.length - 1].id !== prev[prev.length - 1].id)
            ) {
              return latestMsgs;
            }
            return prev;
          });
        });
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (realtimeChannel && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          supabase.removeChannel(realtimeChannel);
        } catch {}
      }
    };
  }, [activeConvId, isDemoMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    const text = inputText.trim();
    setSendError(null);
    setInputText("");
    setIsSending(true);

    const res = await ChatService.sendMessage(activeConvId, activeUserId, text, isDemoMode);
    setIsSending(false);

    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: res.message, updatedAt: res.message!.createdAt }
            : c
        )
      );
    } else {
      // Restore input text so user does not lose message
      setInputText(text);
      setSendError(res.error || "Couldn't send message — please try again.");
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) return;
    setCreatingGroup(true);

    const res = await ChatService.createGroupConversation(
      activeUserId,
      groupName.trim(),
      selectedMemberIds,
      isDemoMode
    );

    setCreatingGroup(false);

    if (res.success && res.conversation) {
      setConversations([res.conversation, ...conversations]);
      setActiveConvId(res.conversation.id);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedMemberIds([]);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId || isDeleting) return;
    setIsDeleting(true);

    const res = await ChatService.deleteConversation(activeConvId, activeUserId, isDemoMode);
    setIsDeleting(false);

    if (res.success) {
      const remaining = conversations.filter((c) => c.id !== activeConvId);
      setConversations(remaining);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      setMessages([]);
      setIsDeleteModalOpen(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Helper to resolve the other participant in a direct conversation
  const getDirectParticipant = (conv?: Conversation) => {
    if (!conv || conv.isGroup) return null;
    const otherMember = conv.members.find((m) => m.userId !== activeUserId) || conv.members[0];
    if (!otherMember) return null;
    const resolved =
      otherMember.user ||
      profilesMap[otherMember.userId] ||
      MOCK_STUDENTS.find((s) => s.id === otherMember.userId);

    const fallbackName =
      conv.name && conv.name !== "Direct Conversation" && conv.name !== "Student"
        ? conv.name
        : "Student";

    return {
      id: otherMember.userId,
      fullName: resolved?.fullName || fallbackName,
      avatarUrl: resolved?.avatarUrl,
      major: resolved?.major,
      college: resolved?.college,
      headline: resolved?.headline,
    };
  };

  const activeParticipant = getDirectParticipant(activeConv);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 font-mono">
      {/* Header */}
      <div className="border-b-2 border-ink pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-ink flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            <span>SQUAD CHAT</span>
          </h1>
          <p className="text-xs text-ink-muted">
            REAL-TIME COLLABORATION, DIRECT MESSAGING & SPRINT ROOMS
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsGroupModalOpen(true)}
          className="flex items-center gap-1 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW GROUP</span>
        </Button>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-hard bg-white shadow-hard-lg min-h-[550px] overflow-hidden">
        {/* Left Sidebar: Conversations */}
        <aside className="border-r-2 border-ink bg-canvas-subtle flex flex-col">
          <div className="p-3 border-b-2 border-ink bg-white font-bold text-xs uppercase flex items-center justify-between text-ink">
            <span>CONVERSATIONS ({conversations.length})</span>
            <span className="text-[10px] text-ink-muted">ACTIVE</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-ink/10">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const participant = getDirectParticipant(conv);
              const title = conv.isGroup ? conv.name : participant?.fullName || conv.name || "Student";
              const avatarSrc = conv.isGroup ? undefined : participant?.avatarUrl;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setSendError(null);
                  }}
                  className={cn(
                    "w-full p-3 text-left transition-colors flex items-start gap-2.5",
                    isActive
                      ? "bg-ink text-white"
                      : "bg-transparent text-ink hover:bg-white"
                  )}
                >
                  <Avatar
                    name={title || "Student"}
                    src={avatarSrc}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("font-bold text-xs uppercase truncate", isActive ? "text-caca-lime" : "text-ink")}>
                        {title || "Student"}
                      </p>
                      {conv.isGroup && (
                        <span className={cn("text-[9px] px-1 border-hard-sm", isActive ? "bg-white/20 text-white" : "bg-canvas-subtle text-ink")}>
                          GRP
                        </span>
                      )}
                    </div>
                    <p className={cn("text-[11px] truncate mt-0.5", isActive ? "text-white/70" : "text-ink-muted")}>
                      {conv.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })}

            {conversations.length === 0 && !loading && (
              <div className="p-6 text-center text-xs text-ink-muted space-y-2">
                <p>No active conversations.</p>
                <p className="text-[10px]">Start messaging candidates from the Discover page.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Section: Active Conversation Thread */}
        <main className="md:col-span-2 flex flex-col bg-white">
          {activeConv ? (
            <>
              {/* Thread Header with Clickable Participant Profile Link & Delete Conversation Action */}
              <div className="p-3 border-b-2 border-ink bg-canvas-subtle flex items-center justify-between">
                {activeConv.isGroup ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-caca-lime border-hard flex items-center justify-center font-bold text-ink">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-black text-xs uppercase text-ink">
                        {activeConv.name}
                      </h2>
                      <span className="text-[10px] text-ink-muted">
                        {activeConv.members.length} SQUAD MEMBERS
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={activeParticipant?.id ? `/profile/${activeParticipant.id}` : "#"}
                    className="flex items-center gap-2.5 hover:opacity-85 transition-opacity group"
                  >
                    <Avatar
                      name={activeParticipant?.fullName || activeConv.name || "Student"}
                      src={activeParticipant?.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <h2 className="font-black text-xs uppercase text-ink group-hover:underline flex items-center gap-1">
                        <span>{activeParticipant?.fullName || activeConv.name}</span>
                        <ExternalLink className="w-3 h-3 text-ink-muted group-hover:text-ink" />
                      </h2>
                      <span className="text-[10px] text-ink-muted uppercase">
                        {activeParticipant?.major ? `${activeParticipant.major} • VIEW PROFILE` : "DIRECT CONVERSATION • VIEW PROFILE"}
                      </span>
                    </div>
                  </Link>
                )}

                <div className="flex items-center gap-2">
                  {activeConv.isGroup && (
                    <Badge variant="lime" size="sm">
                      ACTIVE SPRINT
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 border-hard bg-white hover:bg-caca-coral hover:text-white transition-colors text-ink shadow-hard-sm cursor-pointer"
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white min-h-[380px] max-h-[420px] flex flex-col">
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === activeUserId;
                      const sender =
                        profilesMap[msg.senderId] ||
                        MOCK_STUDENTS.find((s) => s.id === msg.senderId);
                      const senderName = isOwn ? "You" : sender?.fullName || "Student";

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[80%] text-xs",
                            isOwn ? "ml-auto items-end" : "mr-auto items-start"
                          )}
                        >
                          {isOwn ? (
                            <span className="text-[10px] text-ink-muted uppercase font-bold mb-0.5">
                              {senderName}
                            </span>
                          ) : (
                            <Link
                              href={`/profile/${msg.senderId}`}
                              className="text-[10px] text-ink-muted hover:text-ink uppercase font-bold mb-0.5 hover:underline flex items-center gap-1"
                            >
                              <span>{senderName}</span>
                            </Link>
                          )}
                          <div
                            className={cn(
                              "p-2.5 border-hard leading-relaxed shadow-hard-sm",
                              isOwn
                                ? "bg-caca-lime text-ink font-medium"
                                : "bg-canvas-subtle text-ink font-medium"
                            )}
                          >
                            <p className="font-sans text-xs">{msg.content}</p>
                          </div>
                          <span className="text-[9px] text-ink-muted mt-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5 my-auto">
                    <div className="w-10 h-10 border-hard bg-canvas-subtle flex items-center justify-center shadow-hard-sm">
                      <MessageSquare className="w-5 h-5 text-ink" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-xs uppercase text-ink">
                        NO MESSAGES YET
                      </p>
                      <p className="text-[11px] text-ink-muted max-w-xs">
                        Start the conversation with your squad.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Banner if sending failed */}
              {sendError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-500 flex items-center gap-2 text-red-600 text-[11px] font-bold uppercase">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t-2 border-ink bg-canvas-subtle flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (sendError) setSendError(null);
                  }}
                  placeholder="Type message or click mic to dictate..."
                  className="flex-1 h-10 px-3 bg-white border-hard font-mono text-xs text-ink focus:outline-none focus:bg-canvas-subtle"
                />

                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  size="sm"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSending}
                  disabled={!inputText.trim() || isSending}
                  className="h-10 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[450px]">
              <div className="w-12 h-12 border-hard bg-caca-lime flex items-center justify-center shadow-hard">
                <Users className="w-6 h-6 text-ink" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm uppercase text-ink">
                  SELECT A CONVERSATION
                </h3>
                <p className="text-xs text-ink-muted max-w-xs">
                  Choose an active sprint channel or direct message thread from the left list.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="CREATE SQUAD GROUP CHAT"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="block font-bold uppercase text-ink">GROUP / SPRINT NAME</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. EchoSpatial Sprint Hub"
              className="w-full h-10 px-3 bg-white border-hard text-ink focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold uppercase text-ink">SELECT MEMBERS ({selectedMemberIds.length})</label>
            <div className="max-h-48 overflow-y-auto border-hard bg-canvas-subtle p-2 space-y-1 divide-y divide-ink/10">
              {MOCK_STUDENTS.filter((s) => s.id !== activeUserId).map((student) => {
                const isSelected = selectedMemberIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberIds((prev) =>
                        isSelected ? prev.filter((id) => id !== student.id) : [...prev, student.id]
                      );
                    }}
                    className={cn(
                      "w-full p-2 flex items-center justify-between text-left transition-colors cursor-pointer",
                      isSelected ? "bg-caca-lime text-ink font-bold" : "hover:bg-white text-ink"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={student.fullName} src={student.avatarUrl} size="sm" />
                      <div>
                        <p className="font-bold text-xs uppercase">{student.fullName}</p>
                        <p className="text-[10px] text-ink-muted">{student.major}</p>
                      </div>
                    </div>
                    {isSelected && <span className="text-[10px] font-black">✓ ADDED</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateGroup}
              isLoading={creatingGroup}
              disabled={!groupName.trim() || selectedMemberIds.length === 0 || creatingGroup}
            >
              CREATE GROUP
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Conversation Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="DELETE CONVERSATION?"
        className="max-w-md"
      >
        <div className="space-y-4 text-xs font-mono">
          <p className="text-ink text-sm">
            Are you sure you want to delete this conversation?
          </p>
          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              CANCEL
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConversation}
              isLoading={isDeleting}
              className="bg-caca-coral text-white border-hard hover:bg-caca-coral/90"
            >
              DELETE
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 border-hard bg-white shadow-hard text-center max-w-md mx-auto font-mono text-xs font-bold uppercase">
          LOADING SQUAD CHAT...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
