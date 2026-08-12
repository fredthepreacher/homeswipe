import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { conversationsTable, listingsTable, messagesTable } from "@/lib/schema";
import { withUserDb, unauthorized, forbidden } from "@/lib/server-auth";

const SendMessageBody = z.object({ content: z.string().min(1).max(2000) });

type Denied = { denied: "not-found" | "forbidden" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id, 10);
    if (Number.isNaN(convId)) {
      return Response.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const res = await withUserDb(async (tx, userId) => {
      const [conv] = await tx
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, convId));
      if (!conv) return { denied: "not-found" } as Denied;

      const [listing] = await tx
        .select()
        .from(listingsTable)
        .where(and(eq(listingsTable.id, conv.listingId), eq(listingsTable.ownerId, userId)));
      if (!listing) return { denied: "forbidden" } as Denied;

      await tx
        .update(messagesTable)
        .set({ readAt: new Date() })
        .where(and(
          eq(messagesTable.conversationId, convId),
          eq(messagesTable.senderId, conv.consumerId),
          isNull(messagesTable.readAt),
        ));

      return tx
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(messagesTable.createdAt);
    });

    if (!res) return unauthorized();
    if ("denied" in res.data) {
      return res.data.denied === "forbidden"
        ? forbidden()
        : Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const convId = parseInt(id, 10);
    if (Number.isNaN(convId)) {
      return Response.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const { content } = SendMessageBody.parse(await request.json());

    const res = await withUserDb(async (tx, userId) => {
      const [conv] = await tx
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, convId));
      if (!conv) return { denied: "not-found" } as Denied;

      const [listing] = await tx
        .select()
        .from(listingsTable)
        .where(and(eq(listingsTable.id, conv.listingId), eq(listingsTable.ownerId, userId)));
      if (!listing) return { denied: "forbidden" } as Denied;

      const [msg] = await tx
        .insert(messagesTable)
        .values({ conversationId: convId, senderId: userId, content })
        .returning();

      return msg;
    });

    if (!res) return unauthorized();
    if ("denied" in res.data) {
      return res.data.denied === "forbidden"
        ? forbidden()
        : Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    return Response.json(res.data, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid request data" }, { status: 400 });
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
