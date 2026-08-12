import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { listingsTable } from "./listings";

export const inquiriesTable = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Inquiry = typeof inquiriesTable.$inferSelect;
