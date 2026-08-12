import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { conversationsTable, listingsTable } from "@/lib/schema";
import { buildConversationList } from "@/lib/conversations";
import { withUserDb, unauthorized } from "@/lib/server-auth";

const CreateConversationBody = z.object({ listingId: z.number().int().positive() });

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const convRows = await tx
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.consumerId, userId));
      return buildConversationList(tx, convRows);
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { listingId } = CreateConversationBody.parse(await request.json());

    const res = await withUserDb(async (tx, userId) => {
      const [listing] = await tx
        .select()
        .from(listingsTable)
        .where(eq(listingsTable.id, listingId));
      if (!listing) return { notFound: true as const };

      // listings.owner_id is nullable, but the broker inbox finds threads by
      // matching listings.owner_id to the viewer. A thread on an ownerless
      // listing is therefore visible to nobody: the consumer would send
      // messages that silently reach no one. Refuse instead of accepting mail
      // we cannot deliver.
      if (!listing.ownerId) return { unclaimed: true as const };

      const existing = await tx
        .select()
        .from(conversationsTable)
        .where(
          and(
            eq(conversationsTable.listingId, listingId),
            eq(conversationsTable.consumerId, userId)
          )
        );

      if (existing.length > 0) return { conv: existing[0], created: false as const };

      const [conv] = await tx
        .insert(conversationsTable)
        .values({ listingId, consumerId: userId, ownerId: listing.ownerId })
        .returning();

      return { conv, created: true as const };
    });

    if (!res) return unauthorized();
    if ("notFound" in res.data) {
      return Response.json({ error: "Listing not found" }, { status: 404 });
    }
    if ("unclaimed" in res.data) {
      return Response.json(
        { error: "This listing has no agent to message yet." },
        { status: 409 }
      );
    }

    return Response.json(res.data.conv, { status: res.data.created ? 201 : 200 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid request data" }, { status: 400 });
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
