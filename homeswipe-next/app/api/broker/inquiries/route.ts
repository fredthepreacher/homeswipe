import { eq, inArray } from "drizzle-orm";
import { listingsTable, inquiriesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const myListings = await tx
        .select({ id: listingsTable.id, address: listingsTable.address })
        .from(listingsTable)
        .where(eq(listingsTable.ownerId, userId));

      if (myListings.length === 0) return [];

      const listingIds = myListings.map((l) => l.id);
      const listingMap = new Map(myListings.map((l) => [l.id, l.address]));

      const inquiries = await tx
        .select()
        .from(inquiriesTable)
        .where(inArray(inquiriesTable.listingId, listingIds));

      return inquiries.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        listingAddress: listingMap.get(i.listingId) ?? "",
        name: i.name,
        email: i.email,
        message: i.message,
        createdAt: i.createdAt,
      }));
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to get inquiries" }, { status: 500 });
  }
}
