import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";

export const inquiriesTable = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Broker inquiry list joins through listing ownership; the RLS policy does
  // the same lookup per row.
  listingIdx: index("inquiries_listing_id_idx").on(t.listingId),
}));

export type Inquiry = typeof inquiriesTable.$inferSelect;
