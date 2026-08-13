import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { conversationsTable } from "./conversations";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id:             serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id),
  senderId:       text("sender_id").notNull().references(() => usersTable.id),
  content:        text("content").notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  readAt:         timestamp("read_at"),
}, (t) => ({
  // Thread loading, ordered by time; also the inbox's last-message lookup.
  conversationCreatedIdx: index("messages_conversation_id_created_at_idx")
    .on(t.conversationId, t.createdAt),
  // Read receipts filter by sender within a conversation.
  senderIdx: index("messages_sender_id_idx").on(t.senderId),
}));

export type Message = typeof messagesTable.$inferSelect;
