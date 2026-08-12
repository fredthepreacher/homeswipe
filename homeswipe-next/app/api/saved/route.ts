import { and, eq, inArray } from "drizzle-orm";
import { listingsTable, swipesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const savedSwipes = await tx
        .select()
        .from(swipesTable)
        .where(and(eq(swipesTable.userId, userId), eq(swipesTable.direction, "right")));

      const savedIds = [...new Set(savedSwipes.map((s) => s.listingId))];
      if (savedIds.length === 0) return [];

      const listings = await tx
        .select()
        .from(listingsTable)
        .where(inArray(listingsTable.id, savedIds));

      return listings.map((l) => ({
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
