"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Send, Home, Loader2, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { brokerMessagesApi, type Message, type ConversationSummary } from "@/lib/messages-api";
import { formatPrice } from "@/lib/utils";

export default function BrokerConversationThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const router = useRouter();
  const convId = parseInt(id);

  const [messages, setMessages]         = useState<Message[]>([]);
  const [summary, setSummary]           = useState<ConversationSummary | null>(null);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const bottomRef                       = useRef<HTMLDivElement>(null);
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [msgs, convList] = await Promise.all([
          brokerMessagesApi.getMessages(convId),
          brokerMessagesApi.getConversations(),
        ]);
        setMessages(msgs);
        setSummary(convList.find((c) => c.id === convId) ?? null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();

    pollRef.current = setInterval(async () => {
      try {
        const msgs = await brokerMessagesApi.getMessages(convId);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending || !user) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimistic: Message = {
      id: Date.now(),
      conversationId: convId,
      senderId: user.id,
      content: text,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const real = await brokerMessagesApi.sendMessage(convId, text);
      setMessages((m) => m.map((msg) => (msg.id === optimistic.id ? real : msg)));
    } catch {
      setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const consumerFirstName = summary?.consumerName?.split(" ")[0] ?? "Buyer";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="px-4 pt-7 py-3 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 z-10">
        <button onClick={() => router.push("/broker/messages")}
          className="p-2 rounded-xl hover:bg-muted transition text-foreground shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-border">
          <span className="text-primary font-bold text-sm">
            {(summary?.consumerName ?? "?").charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{summary?.consumerName ?? "Buyer"}</p>
          {summary && (
            <p className="text-xs text-muted-foreground truncate">{summary.listingAddress}</p>
          )}
        </div>
      </header>

      {summary && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-muted/30">
          {summary.listingImage ? (
            <img src={summary.listingImage} alt={summary.listingAddress}
              className="w-9 h-9 rounded-lg object-cover border border-border shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 text-primary/50" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{summary.listingAddress}</p>
            <p className="text-[10px] text-muted-foreground">{formatPrice(summary.listingPrice)}</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-lg shrink-0">
            ✓ Matched
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-32">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="h-10 w-48 bg-muted animate-pulse rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
            <Users className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground/60">
              {consumerFirstName} saved your listing — start the conversation!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[78%]">
                    {!isMine && (
                      <p className="text-[10px] text-muted-foreground mb-1 ml-1">{consumerFirstName}</p>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-[10px] text-muted-foreground/50 mt-1 ${isMine ? "text-right" : "text-left"}`}>
                      {relTime(msg.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-safe pt-3 bg-background/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Reply to ${consumerFirstName}…`}
            rows={1}
            className="flex-1 resize-none bg-muted rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 max-h-28 leading-snug"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-all"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground/40 mt-1.5 pb-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
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
