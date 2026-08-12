async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...((init?.headers as Record<string, string>) || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ConversationSummary {
  id:             number;
  listingId:      number;
  consumerId:     string;
  consumerName:   string;
  listingAddress: string;
  listingImage:   string | null;
  listingPrice:   number;
  lastMessage: {
    id: number;
    senderId: string;
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id:             number;
  conversationId: number;
  senderId:       string;
  content:        string;
  createdAt:      string;
  readAt:         string | null;
}

export interface ConversationDetail {
  id:         number;
  listingId:  number;
  consumerId: string;
  ownerId:    string | null;
  createdAt:  string;
}

export const messagesApi = {
  async getOrCreate(listingId: number): Promise<ConversationDetail> {
    return apiFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ listingId }),
    });
  },

  async getConversations(): Promise<ConversationSummary[]> {
    return apiFetch("/api/conversations");
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    return apiFetch(`/api/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: number, content: string): Promise<Message> {
    return apiFetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};

export const brokerMessagesApi = {
  async getConversations(): Promise<ConversationSummary[]> {
    return apiFetch("/api/broker/conversations");
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    return apiFetch(`/api/broker/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: number, content: string): Promise<Message> {
    return apiFetch(`/api/broker/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};
