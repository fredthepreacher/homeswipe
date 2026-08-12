import { pgTable, serial, integer, text, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
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
  userId:        text("user_id").notNull().references(() => usersTable.id),
  budgetMin:     integer("budget_min"),
  budgetMax:     integer("budget_max"),
  budgetType:    text("budget_type"),
  locations:     jsonb("locations").$type<string[]>(),
  moveTimeline:  text("move_timeline"),
  bedroomsMin:   integer("bedrooms_min"),
  propertyTypes: jsonb("property_types").$type<string[]>(),
  amenities:     jsonb("amenities").$type<Amenities>(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId),
}));

export type BuyerPreferences = typeof buyerPreferencesTable.$inferSelect;
