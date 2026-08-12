import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").references(() => usersTable.id),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: numeric("bathrooms", { precision: 4, scale: 1 }).notNull(),
  sqft: integer("sqft").notNull(),
  imageUrl: text("image_url").notNull(),
  propertyType: text("property_type").notNull(),
  subtype: text("subtype"),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const swipesTable = pgTable("swipes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  direction: text("direction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Listing = typeof listingsTable.$inferSelect;
export type Swipe = typeof swipesTable.$inferSelect;
