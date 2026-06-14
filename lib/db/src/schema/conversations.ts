import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { listingsTable } from "./listings";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id:         serial("id").primaryKey(),
  listingId:  integer("listing_id").notNull().references(() => listingsTable.id),
  consumerId: integer("consumer_id").notNull().references(() => usersTable.id),
  ownerId:    integer("owner_id").references(() => usersTable.id),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.listingId, t.consumerId),
}));

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
