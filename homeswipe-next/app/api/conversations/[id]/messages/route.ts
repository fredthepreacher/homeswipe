import { z } from "zod";
import { and, eq, isNull, ne } from "drizzle-orm";
import { conversationsTable, messagesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

const SendMessageBody = z.object({ content: z.string().min(1).max(2000) });

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
        .where(
          and(
            eq(conversationsTable.id, convId),
            eq(conversationsTable.consumerId, userId)
          )
        );
      if (!conv) return null;

      // Mark only the counterparty's messages as read — marking our own would
      // clear the unread badge on the broker's side.
      await tx
        .update(messagesTable)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messagesTable.conversationId, convId),
            ne(messagesTable.senderId, userId),
            isNull(messagesTable.readAt)
          )
        );

      return tx
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(messagesTable.createdAt);
    });

    if (!res) return unauthorized();
    if (res.data === null) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
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
        .where(
          and(
            eq(conversationsTable.id, convId),
            eq(conversationsTable.consumerId, userId)
          )
        );
      if (!conv) return null;

      const [msg] = await tx
        .insert(messagesTable)
        .values({ conversationId: convId, senderId: userId, content })
        .returning();

      return msg;
    });

    if (!res) return unauthorized();
    if (res.data === null) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
    return Response.json(res.data, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid request data" }, { status: 400 });
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
