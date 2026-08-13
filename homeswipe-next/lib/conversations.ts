import { and, count, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Tx } from "./db";
import {
  listingsTable,
  messagesTable,
  usersTable,
  type Conversation,
  type Message,
} from "./schema";

type LastMessageRow = {
  conversation_id: number;
  id: number;
  sender_id: string;
  content: string;
  created_at: Date;
  read_at: Date | null;
};

/**
 * Assembles inbox rows for a set of conversations.
 *
 * Takes the caller's transaction so every read stays inside the RLS context —
 * running these on the admin client would silently widen what a broker or
 * consumer can see.
 *
 * `viewerId` is required because unread is relative to who is looking: it
 * means "messages someone else sent me that I have not read". The previous
 * implementation hardcoded the consumer's perspective while serving both
 * inboxes, so a broker's unread badge counted their own messages awaiting the
 * consumer rather than the consumer's messages awaiting them.
 */
export async function buildConversationList(
  tx: Tx,
  convRows: Conversation[],
  viewerId: string
) {
  if (convRows.length === 0) return [];

  const listingIds  = [...new Set(convRows.map((c) => c.listingId))];
  const consumerIds = [...new Set(convRows.map((c) => c.consumerId))];
  const convIds     = convRows.map((c) => c.id);

  const [listings, consumers, lastMessages, unreadCounts] = await Promise.all([
    tx.select().from(listingsTable).where(inArray(listingsTable.id, listingIds)),

    tx.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(inArray(usersTable.id, consumerIds)),

    // One row per conversation instead of every message in every thread. The
    // old version pulled all message bodies just to find the newest of each
    // and count unread ones.
    //
    // DISTINCT ON has no query-builder equivalent, so this is raw SQL. The id
    // list is joined into individual bind parameters — interpolating the array
    // directly would bind it as one value and quietly match nothing.
    tx.execute(sql`
      select distinct on (conversation_id)
        conversation_id, id, sender_id, content, created_at, read_at
      from messages
      where conversation_id in (${sql.join(convIds.map((id) => sql`${id}`), sql`, `)})
      order by conversation_id, created_at desc
    `),

    // Aggregated in Postgres. This replaced a nested loop over
    // conversations x messages that ran on every inbox request.
    tx
      .select({
        conversationId: messagesTable.conversationId,
        unread: count(),
      })
      .from(messagesTable)
      .where(
        and(
          inArray(messagesTable.conversationId, convIds),
          ne(messagesTable.senderId, viewerId),
          isNull(messagesTable.readAt)
        )
      )
      .groupBy(messagesTable.conversationId),
  ]);

  const listingMap  = new Map(listings.map((l) => [l.id, l]));
  const consumerMap = new Map(consumers.map((u) => [u.id, u]));

  const lastMsgMap = new Map<number, Message>();
  for (const r of lastMessages.rows as unknown as LastMessageRow[]) {
    lastMsgMap.set(r.conversation_id, {
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      content: r.content,
      createdAt: r.created_at,
      readAt: r.read_at,
    });
  }

  const unreadMap = new Map<number, number>();
  for (const r of unreadCounts) {
    unreadMap.set(r.conversationId, r.unread);
  }

  return convRows
    .map((c) => {
      const listing = listingMap.get(c.listingId);
      return {
        id:             c.id,
        listingId:      c.listingId,
        consumerId:     c.consumerId,
        consumerName:   consumerMap.get(c.consumerId)?.name ?? "Unknown",
        listingAddress: listing ? `${listing.address}, ${listing.city}` : "Unknown property",
        listingImage:   listing?.imageUrl ?? null,
        listingPrice:   listing ? Number(listing.price) : 0,
        lastMessage:    lastMsgMap.get(c.id) ?? null,
        unreadCount:    unreadMap.get(c.id) ?? 0,
        createdAt:      c.createdAt,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}
