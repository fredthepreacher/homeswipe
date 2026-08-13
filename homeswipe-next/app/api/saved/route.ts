import { and, desc, eq } from "drizzle-orm";
import { listingsTable, swipesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      // Single join instead of fetching swipes, deduping ids in JS, then
      // issuing a second query with an IN list.
      const rows = await tx
        .select({ listing: listingsTable })
        .from(swipesTable)
        .innerJoin(listingsTable, eq(listingsTable.id, swipesTable.listingId))
        .where(and(eq(swipesTable.userId, userId), eq(swipesTable.direction, "right")))
        .orderBy(desc(swipesTable.createdAt));

      return rows.map(({ listing: l }) => ({
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
        saved: true,
      }));
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch saved listings" }, { status: 500 });
  }
}
