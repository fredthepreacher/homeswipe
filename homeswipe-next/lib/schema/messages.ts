import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { conversationsTable } from "./conversations";
import { usersTable } from "./users";

export const messagesTable = pgTable("messages", {
  id:             serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id),
  senderId:       text("sender_id").notNull().references(() => usersTable.id),
  content:        text("content").notNull(),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  readAt:         timestamp("read_at"),
});

export type Message = typeof messagesTable.$inferSelect;
