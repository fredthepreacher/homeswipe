const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("homeswipe_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...authHeaders(), ...(init?.headers as Record<string, string> || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Types ────────────────────────────────────────────── */
export interface ConversationSummary {
  id:             number;
  listingId:      number;
  consumerId:     number;
  consumerName:   string;
  listingAddress: string;
  listingImage:   string | null;
  listingPrice:   number;
  lastMessage: {
    id: number;
    senderId: number;
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id:             number;
  conversationId: number;
  senderId:       number;
  content:        string;
  createdAt:      string;
  readAt:         string | null;
}

export interface ConversationDetail {
  id:         number;
  listingId:  number;
  consumerId: number;
  ownerId:    number | null;
  createdAt:  string;
}

/* ── Consumer API ─────────────────────────────────────── */
export const messagesApi = {
  /** Create or return existing conversation for a saved listing */
  async getOrCreate(listingId: number): Promise<ConversationDetail> {
    return apiFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ listingId }),
    });
  },

  /** List consumer's conversations */
  async getConversations(): Promise<ConversationSummary[]> {
    return apiFetch("/api/conversations");
  },

  /** Get messages in a conversation */
  async getMessages(conversationId: number): Promise<Message[]> {
    return apiFetch(`/api/conversations/${conversationId}/messages`);
  },

  /** Send a message as consumer */
  async sendMessage(conversationId: number, content: string): Promise<Message> {
    return apiFetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};

/* ── Broker API ───────────────────────────────────────── */
export const brokerMessagesApi = {
  /** List broker's conversations */
  async getConversations(): Promise<ConversationSummary[]> {
    return apiFetch("/api/broker/conversations");
  },

  /** Get messages in a conversation */
  async getMessages(conversationId: number): Promise<Message[]> {
    return apiFetch(`/api/broker/conversations/${conversationId}/messages`);
  },

  /** Send a message as broker */
  async sendMessage(conversationId: number, content: string): Promise<Message> {
    return apiFetch(`/api/broker/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};
