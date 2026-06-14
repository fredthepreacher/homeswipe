import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, ChevronRight, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";
import { brokerMessagesApi, type ConversationSummary } from "@/lib/messages-api";
import { formatPrice } from "@/lib/utils";

export default function BrokerMessages() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    brokerMessagesApi.getConversations()
      .then(setConversations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="px-5 pt-7 pb-4 sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border/40">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {conversations.length} active conversation{conversations.length !== 1 ? "s" : ""} from matched renters & buyers
        </p>
      </header>

      <main className="flex-1 px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <h3 className="text-lg font-bold">No messages yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                When renters or buyers save your listings and reach out, their messages will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/broker/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 bg-card rounded-2xl p-3.5 border border-border/50 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
              >
                {/* Property thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                  {conv.listingImage ? (
                    <img src={conv.listingImage} alt={conv.listingAddress} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <MessageCircle className="w-6 h-6 text-primary/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="font-semibold text-sm text-foreground truncate">
                        {conv.consumerName}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                    <span className="truncate">{conv.listingAddress}</span>
                    <span className="shrink-0 text-muted-foreground/40">·</span>
                    <span className="shrink-0">{formatPrice(conv.listingPrice)}</span>
                  </p>

                  {conv.lastMessage ? (
                    <p className="text-xs text-muted-foreground mt-1.5 truncate leading-snug">
                      {conv.lastMessage.senderId === conv.consumerId
                        ? conv.consumerName.split(" ")[0]
                        : "You"}: {conv.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-1.5 italic">No messages yet</p>
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
        )}
      </main>
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
