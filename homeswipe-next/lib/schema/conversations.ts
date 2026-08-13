import { pgTable, serial, integer, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id:         serial("id").primaryKey(),
  listingId:  integer("listing_id").notNull().references(() => listingsTable.id),
  consumerId: text("consumer_id").notNull().references(() => usersTable.id),
  ownerId:    text("owner_id").references(() => usersTable.id),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Leading column listing_id also serves listing-scoped lookups, so no
  // separate index is needed for those.
  uniq: unique().on(t.listingId, t.consumerId),
  // Consumer inbox, and the consumer_id branch of the RLS policies.
  consumerIdx: index("conversations_consumer_id_idx").on(t.consumerId),
  // Broker inbox, and the owner_id branch of the RLS policies. Also backs the
  // users_select policy, which finds conversation counterparties.
  ownerIdx: index("conversations_owner_id_idx").on(t.ownerId),
}));

export type Conversation = typeof conversationsTable.$inferSelect;
