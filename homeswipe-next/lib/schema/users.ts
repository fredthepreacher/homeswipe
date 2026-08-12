import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  role: text("role").notNull().default("consumer"), // consumer | broker | landlord | admin
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  licenseId: text("license_id"),
  licenseState: text("license_state"),
  brokerage: text("brokerage"),
  businessAddress: text("business_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
