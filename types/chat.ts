import { StudentProfile } from "./user";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: StudentProfile;
  content: string;
  createdAt: string;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  user?: StudentProfile;
  joinedAt: string;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  members: ConversationMember[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}
