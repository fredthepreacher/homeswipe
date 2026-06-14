import { pgTable, serial, integer, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export interface Amenities {
  pool:          boolean;
  petFriendly:   boolean;
  inUnitLaundry: boolean;
  gym:           boolean;
  yard:          boolean;
  parking:       boolean;
  elevator:      boolean;
  garageType:    "none" | "1-car" | "2-car";
}

export const buyerPreferencesTable = pgTable("buyer_preferences", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id").notNull().references(() => usersTable.id),
  budgetMin:     integer("budget_min"),
  budgetMax:     integer("budget_max"),
  budgetType:    text("budget_type"),    // "rent" | "purchase"
  locations:     jsonb("locations").$type<string[]>(),
  moveTimeline:  text("move_timeline"),  // "asap" | "1-3m" | "3-6m" | "6m+" | "browsing"
  bedroomsMin:   integer("bedrooms_min"),
  propertyTypes: jsonb("property_types").$type<string[]>(),
  amenities:     jsonb("amenities").$type<Amenities>(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId),
}));

export const insertBuyerPreferencesSchema = createInsertSchema(buyerPreferencesTable).omit({ id: true, updatedAt: true });
export type InsertBuyerPreferences = z.infer<typeof insertBuyerPreferencesSchema>;
export type BuyerPreferences = typeof buyerPreferencesTable.$inferSelect;
