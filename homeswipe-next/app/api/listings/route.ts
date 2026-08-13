import { and, eq } from "drizzle-orm";
import { listingsTable, swipesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

// The feed is finite. Without a cap this returned every Manhattan listing in
// one response, which is fine at ten rows and not at ten thousand.
const MAX_FEED = 200;

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      // Single query. Previously this fetched the listings, then fetched every
      // swipe the user had ever made, and intersected them in JavaScript just
      // to set one boolean per row.
      const rows = await tx
        .select({
          listing: listingsTable,
          direction: swipesTable.direction,
        })
        .from(listingsTable)
        .leftJoin(
          swipesTable,
          and(
            eq(swipesTable.listingId, listingsTable.id),
            eq(swipesTable.userId, userId)
          )
        )
        .where(eq(listingsTable.city, "Manhattan"))
        .orderBy(listingsTable.id)
        .limit(MAX_FEED);

      return rows.map(({ listing: l, direction }) => ({
        id: l.id,
        price: Number(l.price),
        address: l.address,
        city: l.city,
        state: l.state,
        bedrooms: l.bedrooms,
        bathrooms: Number(l.bathrooms),
        sqft: l.sqft,
        imageUrl: l.imageUrl,
        propertyType: l.propertyType,
        subtype: l.subtype ?? null,
        description: l.description,
        saved: direction === "right",
      }));
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
