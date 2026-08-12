import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id:         serial("id").primaryKey(),
  listingId:  integer("listing_id").notNull().references(() => listingsTable.id),
  consumerId: text("consumer_id").notNull().references(() => usersTable.id),
  ownerId:    text("owner_id").references(() => usersTable.id),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.listingId, t.consumerId),
}));

export type Conversation = typeof conversationsTable.$inferSelect;
