"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { messagesApi, type ConversationSummary } from "@/lib/messages-api";
import { formatPrice } from "@/lib/utils";

export function ConsumerInbox() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    messagesApi.getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-[55vh] flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5">
          <MessageCircle className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">No messages yet</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Swipe right on a property and tap{" "}
          <span className="text-primary font-semibold">Message Agent</span> to start a conversation.
          You can only message agents for homes you&apos;ve saved.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {conversations.map((conv, i) => (
        <motion.button
          key={conv.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => router.push(`/inbox/${conv.id}`)}
          className="w-full flex items-center gap-3 bg-card rounded-2xl p-3.5 border border-border/50 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
            {conv.listingImage ? (
              <img src={conv.listingImage} alt={conv.listingAddress} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <MessageCircle className="w-6 h-6 text-primary/40" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground truncate leading-tight">
                {conv.listingAddress}
              </p>
              {conv.unreadCount > 0 && (
                <span className="shrink-0 min-w-[20px] h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {conv.unreadCount}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(conv.listingPrice)}</p>

            {conv.lastMessage ? (
              <p className="text-xs text-muted-foreground mt-1.5 truncate leading-snug">
                {conv.lastMessage.senderId === conv.consumerId ? "You: " : "Agent: "}
                {conv.lastMessage.content}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 mt-1.5 italic">No messages yet</p>
            )}

            {conv.lastMessage && (
              <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {relTime(conv.lastMessage.createdAt)}
              </p>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        </motion.button>
      ))}
    </div>
  );
}

function relTime(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}
