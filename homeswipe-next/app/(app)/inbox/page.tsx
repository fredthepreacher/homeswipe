"use client";

import { ConsumerInbox } from "@/components/ConsumerInbox";

export default function InboxPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="pt-safe px-6 py-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
        <h1 className="text-2xl font-display font-bold text-center tracking-tight">Messages</h1>
      </header>
      <main className="flex-1">
        <ConsumerInbox />
      </main>
    </div>
  );
}
