import { eq, inArray } from "drizzle-orm";
import { conversationsTable, listingsTable } from "@/lib/schema";
import { buildConversationList } from "@/lib/conversations";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const ownedListings = await tx
        .select({ id: listingsTable.id })
        .from(listingsTable)
        .where(eq(listingsTable.ownerId, userId));

      if (ownedListings.length === 0) return [];

      const listingIds = ownedListings.map((l) => l.id);
      const convRows = await tx
        .select()
        .from(conversationsTable)
        .where(inArray(conversationsTable.listingId, listingIds));

      return buildConversationList(tx, convRows, userId);
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch broker conversations" }, { status: 500 });
  }
}
