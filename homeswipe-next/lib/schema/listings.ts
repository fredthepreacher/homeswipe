import { pgTable, text, serial, numeric, integer, timestamp, index, unique } from "drizzle-orm/pg-core";
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
}, (t) => ({
  // Backs every broker-scoped query and the owner_id checks inside the
  // conversations / inquiries / messages RLS policies.
  ownerIdx: index("listings_owner_id_idx").on(t.ownerId),
  // The consumer feed filters on city (Manhattan-only for launch).
  cityIdx: index("listings_city_idx").on(t.city),
}));

export const swipesTable = pgTable("swipes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  listingId: integer("listing_id").notNull().references(() => listingsTable.id),
  direction: text("direction").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // Saved-listings and feed queries filter by user, often with direction.
  userDirectionIdx: index("swipes_user_id_direction_idx").on(t.userId, t.direction),
  listingIdx: index("swipes_listing_id_idx").on(t.listingId),
  // One row per user per listing. Re-swiping previously appended a new row
  // every time, so the table grew without bound; the API now upserts.
  userListingUniq: unique("swipes_user_id_listing_id_unique").on(t.userId, t.listingId),
}));

export type Listing = typeof listingsTable.$inferSelect;
export type Swipe = typeof swipesTable.$inferSelect;
