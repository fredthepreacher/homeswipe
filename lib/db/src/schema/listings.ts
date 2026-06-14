import { pgTable, text, serial, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id"),
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
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  direction: text("direction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({ id: true, createdAt: true });
export const insertSwipeSchema = createInsertSchema(swipesTable).omit({ id: true, createdAt: true });

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Swipe = typeof swipesTable.$inferSelect;
