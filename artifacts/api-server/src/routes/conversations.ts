import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  listingsTable,
  usersTable,
} from "@workspace/db";
import { eq, inArray, desc, and, isNull } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "homesweep-jwt-dev-secret-2025";

function requireAuth(req: any): { userId: number; role: string } {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number; role: string };
  return { userId: payload.userId, role: payload.role };
}

const CreateConversationBody = z.object({ listingId: z.number().int().positive() });
const SendMessageBody        = z.object({ content: z.string().min(1).max(2000) });

/* ── helpers ──────────────────────────────────────────────── */
async function buildConversationList(
  convRows: { id: number; listingId: number; consumerId: number; ownerId: number | null; createdAt: Date }[]
) {
  if (convRows.length === 0) return [];

  const listingIds  = [...new Set(convRows.map((c) => c.listingId))];
  const consumerIds = [...new Set(convRows.map((c) => c.consumerId))];
  const convIds     = convRows.map((c) => c.id);

  const [listings, consumers, allMessages] = await Promise.all([
    db.select().from(listingsTable).where(inArray(listingsTable.id, listingIds)),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
      .where(inArray(usersTable.id, consumerIds)),
    db.select().from(messagesTable)
      .where(inArray(messagesTable.conversationId, convIds))
      .orderBy(desc(messagesTable.createdAt)),
  ]);

  const listingMap  = new Map(listings.map((l) => [l.id, l]));
  const consumerMap = new Map(consumers.map((u) => [u.id, u]));

  // Keep only the most-recent message per conversation
  const lastMsgMap = new Map<number, (typeof allMessages)[0]>();
  for (const msg of allMessages) {
    if (!lastMsgMap.has(msg.conversationId)) lastMsgMap.set(msg.conversationId, msg);
  }

  // Unread count (messages sent by the other party that have no readAt)
  const unreadMap = new Map<number, number>();
  for (const conv of convRows) {
    let count = 0;
    for (const msg of allMessages) {
      if (msg.conversationId === conv.id && msg.senderId !== conv.consumerId && !msg.readAt)
        count++;
    }
    unreadMap.set(conv.id, count);
  }

  return convRows.map((c) => {
    const listing = listingMap.get(c.listingId);
    return {
      id:          c.id,
      listingId:   c.listingId,
      consumerId:  c.consumerId,
      consumerName: consumerMap.get(c.consumerId)?.name ?? "Unknown",
      listingAddress: listing ? `${listing.address}, ${listing.city}` : "Unknown property",
      listingImage:   listing?.imageUrl ?? null,
      listingPrice:   listing ? Number(listing.price) : 0,
      lastMessage:    lastMsgMap.get(c.id) ?? null,
      unreadCount:    unreadMap.get(c.id) ?? 0,
      createdAt:      c.createdAt,
    };
  }).sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? a.createdAt;
    const bTime = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

/* ══════════════════════════════════════════════════════════
   CONSUMER ROUTES
══════════════════════════════════════════════════════════ */

/** POST /conversations — create or return existing conversation */
router.post("/conversations", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const { listingId } = CreateConversationBody.parse(req.body);

    // Fetch listing to get ownerId
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, listingId));
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    // Upsert conversation (ignore duplicate on listingId+consumerId)
    const existing = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.listingId, listingId), eq(conversationsTable.consumerId, userId)));

    if (existing.length > 0) return res.json(existing[0]);

    const [conv] = await db
      .insert(conversationsTable)
      .values({ listingId, consumerId: userId, ownerId: listing.ownerId ?? null })
      .returning();

    res.status(201).json(conv);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "POST /conversations");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/** GET /conversations — list consumer's conversations */
router.get("/conversations", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const convRows = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.consumerId, userId));

    res.json(await buildConversationList(convRows));
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "GET /conversations");
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/** GET /conversations/:id/messages */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const convId = parseInt(req.params.id, 10);

    const [conv] = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.consumerId, userId)));

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Mark messages from the other party as read
    await db
      .update(messagesTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messagesTable.conversationId, convId),
          isNull(messagesTable.readAt)
        )
      );

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.createdAt);

    res.json(messages);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "GET /conversations/:id/messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /conversations/:id/messages */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const convId = parseInt(req.params.id, 10);
    const { content } = SendMessageBody.parse(req.body);

    const [conv] = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.id, convId), eq(conversationsTable.consumerId, userId)));

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const [msg] = await db
      .insert(messagesTable)
      .values({ conversationId: convId, senderId: userId, content })
      .returning();

    res.status(201).json(msg);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "POST /conversations/:id/messages");
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ══════════════════════════════════════════════════════════
   BROKER / LANDLORD ROUTES
══════════════════════════════════════════════════════════ */

/** GET /broker/conversations */
router.get("/broker/conversations", async (req, res) => {
  try {
    const { userId } = requireAuth(req);

    // Get all listings owned by this broker
    const ownedListings = await db.select({ id: listingsTable.id })
      .from(listingsTable).where(eq(listingsTable.ownerId, userId));

    if (ownedListings.length === 0) return res.json([]);

    const listingIds = ownedListings.map((l) => l.id);
    const convRows   = await db
      .select()
      .from(conversationsTable)
      .where(inArray(conversationsTable.listingId, listingIds));

    res.json(await buildConversationList(convRows));
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "GET /broker/conversations");
    res.status(500).json({ error: "Failed to fetch broker conversations" });
  }
});

/** GET /broker/conversations/:id/messages */
router.get("/broker/conversations/:id/messages", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const convId = parseInt(req.params.id, 10);

    // Verify broker owns the listing in this conversation
    const [conv] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, convId));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const [listing] = await db.select().from(listingsTable)
      .where(and(eq(listingsTable.id, conv.listingId), eq(listingsTable.ownerId, userId)));
    if (!listing) return res.status(403).json({ error: "Access denied" });

    // Mark consumer messages as read by the broker
    await db
      .update(messagesTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messagesTable.conversationId, convId),
          eq(messagesTable.senderId, conv.consumerId),
          isNull(messagesTable.readAt)
        )
      );

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.createdAt);

    res.json(messages);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "GET /broker/conversations/:id/messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/** POST /broker/conversations/:id/messages */
router.post("/broker/conversations/:id/messages", async (req, res) => {
  try {
    const { userId } = requireAuth(req);
    const convId = parseInt(req.params.id, 10);
    const { content } = SendMessageBody.parse(req.body);

    const [conv] = await db.select().from(conversationsTable)
      .where(eq(conversationsTable.id, convId));
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const [listing] = await db.select().from(listingsTable)
      .where(and(eq(listingsTable.id, conv.listingId), eq(listingsTable.ownerId, userId)));
    if (!listing) return res.status(403).json({ error: "Access denied" });

    const [msg] = await db
      .insert(messagesTable)
      .values({ conversationId: convId, senderId: userId, content })
      .returning();

    res.status(201).json(msg);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "POST /broker/conversations/:id/messages");
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
