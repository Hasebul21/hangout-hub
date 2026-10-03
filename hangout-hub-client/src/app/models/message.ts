export interface Message {
  id: string;
  conversationId: string;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
}

export interface Presence {
  onlineUserIds: number[];
  lastSeen: Record<number, string>;
}
