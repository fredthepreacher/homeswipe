"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Send, Home, Loader2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { messagesApi, type Message } from "@/lib/messages-api";
import { formatPrice } from "@/lib/utils";

export default function ConversationThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const router = useRouter();

  // id can be a conversation id ("12") or a "new-<listingId>" request
  const isNew = id.startsWith("new-");
  const newListingId = isNew ? id.slice(4) : null;
  const initialConvId = !isNew ? parseInt(id, 10) : null;

  const [convId, setConvId]                 = useState<number | null>(initialConvId);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [listingAddress, setListingAddress] = useState<string>("");
  const [listingImage, setListingImage]     = useState<string | null>(null);
  const [listingPrice, setListingPrice]     = useState<number>(0);
  const [input, setInput]                   = useState("");
  const [sending, setSending]               = useState(false);
  const [loading, setLoading]               = useState(true);
  const [initError, setInitError]           = useState("");
  const bottomRef                           = useRef<HTMLDivElement>(null);
  const inputRef                            = useRef<HTMLTextAreaElement>(null);
  const pollRef                             = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        if (newListingId) {
          const conv = await messagesApi.getOrCreate(parseInt(newListingId));
          setConvId(conv.id);
        }
      } catch (err: any) {
        setInitError(err.message || "Could not start conversation");
        setLoading(false);
      }
    }
    if (isNew) init();
  }, [newListingId, isNew]);

  useEffect(() => {
    if (!convId) return;

    async function load() {
      try {
        const [msgs, convList] = await Promise.all([
          messagesApi.getMessages(convId!),
          messagesApi.getConversations(),
        ]);
        setMessages(msgs);
        const summary = convList.find((c) => c.id === convId!);
        if (summary) {
          setListingAddress(summary.listingAddress);
          setListingImage(summary.listingImage);
          setListingPrice(summary.listingPrice);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }

    load();

    pollRef.current = setInterval(async () => {
      try {
        const msgs = await messagesApi.getMessages(convId!);
        setMessages(msgs);
      } catch { /* ignore */ }
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!convId || !input.trim() || sending || !user) return;
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
      const real = await messagesApi.sendMessage(convId, text);
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

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-4 bg-background">
        <Lock className="w-12 h-12 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Cannot start conversation</h2>
        <p className="text-sm text-muted-foreground">{initError}</p>
        <button onClick={() => router.push("/saved")}
          className="mt-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
          Back to Saved
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="pt-safe px-4 py-3 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 z-10">
        <button onClick={() => router.push("/saved")}
          className="p-2 rounded-xl hover:bg-muted transition text-foreground shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {listingImage ? (
          <img src={listingImage} alt={listingAddress}
            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-primary/60" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{listingAddress || "Property"}</p>
          {listingPrice > 0 && (
            <p className="text-xs text-muted-foreground">{formatPrice(listingPrice)}</p>
          )}
        </div>
      </header>

      <div className="px-4 py-2 bg-success/10 border-b border-success/20 flex items-center gap-2">
        <span className="text-[10px] font-bold text-success uppercase tracking-wider">✓ Matched</span>
        <span className="text-[10px] text-success/70">You saved this home — messaging is unlocked</span>
      </div>

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
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground/60">Say hello to the agent!</p>
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message agent…"
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
