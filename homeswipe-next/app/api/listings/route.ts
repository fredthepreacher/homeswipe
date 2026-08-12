import { eq } from "drizzle-orm";
import { listingsTable, swipesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      // Scoped to Manhattan, NY for launch
      const listings = await tx
        .select()
        .from(listingsTable)
        .where(eq(listingsTable.city, "Manhattan"))
        .orderBy(listingsTable.id);

      const mySwipes = await tx
        .select()
        .from(swipesTable)
        .where(eq(swipesTable.userId, userId));

      const savedIds = new Set(
        mySwipes.filter((s) => s.direction === "right").map((s) => s.listingId)
      );

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
        saved: savedIds.has(l.id),
      }));
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}
