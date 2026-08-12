import { inArray, desc } from "drizzle-orm";
import type { Tx } from "./db";
import { listingsTable, messagesTable, usersTable, type Conversation } from "./schema";

// Takes the caller's transaction so these reads stay inside the RLS context —
// running them on the admin client would silently widen what a broker or
// consumer can see.
export async function buildConversationList(tx: Tx, convRows: Conversation[]) {
  if (convRows.length === 0) return [];

  const listingIds  = [...new Set(convRows.map((c) => c.listingId))];
  const consumerIds = [...new Set(convRows.map((c) => c.consumerId))];
  const convIds     = convRows.map((c) => c.id);

  const [listings, consumers, allMessages] = await Promise.all([
    tx.select().from(listingsTable).where(inArray(listingsTable.id, listingIds)),
    tx.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
      .where(inArray(usersTable.id, consumerIds)),
    tx.select().from(messagesTable)
      .where(inArray(messagesTable.conversationId, convIds))
      .orderBy(desc(messagesTable.createdAt)),
  ]);

  const listingMap  = new Map(listings.map((l) => [l.id, l]));
  const consumerMap = new Map(consumers.map((u) => [u.id, u]));

  const lastMsgMap = new Map<number, (typeof allMessages)[0]>();
  for (const msg of allMessages) {
    if (!lastMsgMap.has(msg.conversationId)) lastMsgMap.set(msg.conversationId, msg);
  }

  const unreadMap = new Map<number, number>();
  for (const conv of convRows) {
    let count = 0;
    for (const msg of allMessages) {
      if (msg.conversationId === conv.id && msg.senderId !== conv.consumerId && !msg.readAt) count++;
    }
    unreadMap.set(conv.id, count);
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
