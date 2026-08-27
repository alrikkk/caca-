"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ChatService } from "@/services/chat-service";
import { Conversation, ChatMessage } from "@/types/chat";
import { MOCK_STUDENTS, CURRENT_USER } from "@/lib/mock-data";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import {
  Send,
  Plus,
  Users,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
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

  // New Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUserId = profile?.id || CURRENT_USER.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const initChat = async () => {
      setLoading(true);
      const list = await ChatService.getConversations(activeUserId);
      setConversations(list);

      if (recipientId && recipientId !== activeUserId) {
        // Direct conversation with recipient requested
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

  useEffect(() => {
    if (activeConvId) {
      const loadMsgs = async () => {
        const msgs = await ChatService.getMessages(activeConvId);
        setMessages(msgs);
      };
      loadMsgs();
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    const res = await ChatService.sendMessage(activeConvId, activeUserId, text, isDemoMode);
    setIsSending(false);

    if (res.success && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: res.message, updatedAt: res.message!.createdAt }
            : c
        )
      );
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

  const activeConv = conversations.find((c) => c.id === activeConvId);

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
              const otherMember = conv.members.find((m) => m.userId !== activeUserId)?.user;
              const title = conv.isGroup ? conv.name : otherMember?.fullName || conv.name || "Student";

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full p-3 text-left transition-colors flex items-start gap-2.5",
                    isActive
                      ? "bg-ink text-white"
                      : "bg-transparent text-ink hover:bg-white"
                  )}
                >
                  <Avatar
                    name={title || "Student"}
                    src={conv.isGroup ? undefined : otherMember?.avatarUrl}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("font-bold text-xs uppercase truncate", isActive ? "text-caca-lime" : "text-ink")}>
                        {title}
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

            {conversations.length === 0 && (
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
              {/* Thread Header */}
              <div className="p-3 border-b-2 border-ink bg-canvas-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={activeConv.name || "Chat"}
                    size="sm"
                  />
                  <div>
                    <h2 className="font-black text-xs uppercase text-ink">
                      {activeConv.name}
                    </h2>
                    <span className="text-[10px] text-ink-muted">
                      {activeConv.isGroup
                        ? `${activeConv.members.length} SQUAD MEMBERS`
                        : "DIRECT CONVERSATION"}
                    </span>
                  </div>
                </div>

                {activeConv.isGroup && (
                  <Badge variant="lime" size="sm">
                    ACTIVE SPRINT
                  </Badge>
                )}
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white min-h-[380px] max-h-[420px] flex flex-col">
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg) => {
                      const isOwn = msg.senderId === activeUserId;
                      const senderStudent = MOCK_STUDENTS.find((s) => s.id === msg.senderId);
                      const senderName = isOwn ? "You" : senderStudent?.fullName || "Student";

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[80%] text-xs",
                            isOwn ? "ml-auto items-end" : "mr-auto items-start"
                          )}
                        >
                          <span className="text-[10px] text-ink-muted uppercase font-bold mb-0.5">
                            {senderName}
                          </span>
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

              {/* Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t-2 border-ink bg-canvas-subtle flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
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
        <div className="space-y-4 font-mono text-xs">
          <Input
            label="GROUP NAME"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. AI Vision Hackathon Squad 🚀"
            required
          />

          <div className="space-y-1.5">
            <label className="block font-bold uppercase text-ink">
              SELECT SQUAD MEMBERS
            </label>
            <div className="max-h-48 overflow-y-auto divide-y divide-ink/10 border-hard bg-canvas-subtle p-2 space-y-1">
              {MOCK_STUDENTS.filter((s) => s.id !== activeUserId).map((student) => {
                const isSelected = selectedMemberIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberIds((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== student.id)
                          : [...prev, student.id]
                      );
                    }}
                    className={cn(
                      "w-full p-2 text-left flex items-center justify-between border-hard-sm transition-colors",
                      isSelected ? "bg-caca-lime text-ink" : "bg-white text-ink hover:bg-canvas"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={student.fullName} src={student.avatarUrl} size="sm" />
                      <div>
                        <p className="font-bold text-xs">{student.fullName}</p>
                        <p className="text-[10px] text-ink-muted">{student.major}</p>
                      </div>
                    </div>
                    <span>{isSelected ? "✓" : "+"}</span>
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
              disabled={!groupName.trim() || selectedMemberIds.length === 0}
            >
              CREATE SQUAD CHAT
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
        <div className="p-10 border-hard bg-white shadow-hard text-center max-w-md mx-auto font-mono">
          <p className="text-xs font-bold uppercase text-ink-muted">
            LOADING SQUAD CHAT...
          </p>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
