import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, listingsTable, inquiriesTable, auditLogsTable } from "@workspace/db";
import { desc, count, gte, sql } from "drizzle-orm";
import { logAction } from "../lib/audit";

const router: IRouter = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "homesweep-jwt-dev-secret-2025";

function requireAdmin(req: any): number {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number; role?: string };
  if (payload.role !== "admin") throw Object.assign(new Error("Forbidden"), { status: 403 });
  return payload.userId;
}

function makeAdminToken(userId: number) {
  return jwt.sign({ userId, role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
}

/* ── Stats ─────────────────────────────────────────── */
router.get("/admin/stats", async (req, res) => {
  try {
    requireAdmin(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [[totalUsers], [totalListings], [totalInquiries], [eventsToday]] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(listingsTable),
      db.select({ count: count() }).from(inquiriesTable),
      db.select({ count: count() }).from(auditLogsTable).where(gte(auditLogsTable.createdAt, todayStart)),
    ]);

    const usersByRole = await db
      .select({ role: usersTable.role, count: count() })
      .from(usersTable)
      .groupBy(usersTable.role);

    res.json({
      totalUsers: totalUsers.count,
      totalListings: totalListings.count,
      totalInquiries: totalInquiries.count,
      eventsToday: eventsToday.count,
      usersByRole,
    });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

/* ── Users ──────────────────────────────────────────── */
router.get("/admin/users", async (req, res) => {
  try {
    requireAdmin(req);
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        licenseState: usersTable.licenseState,
        brokerage: usersTable.brokerage,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json(users);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

/* ── Listings (all, with owner info) ───────────────── */
router.get("/admin/listings", async (req, res) => {
  try {
    requireAdmin(req);
    const listings = await db.select().from(listingsTable).orderBy(desc(listingsTable.createdAt));

    const ownerIds = [...new Set(listings.map((l) => l.ownerId).filter(Boolean))] as number[];
    let ownerMap = new Map<number, string>();

    if (ownerIds.length > 0) {
      const owners = await db
        .select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable);
      owners.forEach((o) => ownerMap.set(o.id, o.name));
    }

    res.json(
      listings.map((l) => ({
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
        createdAt: l.createdAt,
        ownerId: l.ownerId,
        ownerName: l.ownerId ? (ownerMap.get(l.ownerId) ?? "Unknown") : "HomeSweep (seeded)",
      }))
    );
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

/* ── Inquiries (all) ───────────────────────────────── */
router.get("/admin/inquiries", async (req, res) => {
  try {
    requireAdmin(req);
    const inquiries = await db.select().from(inquiriesTable).orderBy(desc(inquiriesTable.createdAt));

    const listingIds = [...new Set(inquiries.map((i) => i.listingId))];
    const listings = await db.select({ id: listingsTable.id, address: listingsTable.address }).from(listingsTable);
    const listingMap = new Map(listings.map((l) => [l.id, l.address]));

    res.json(
      inquiries.map((i) => ({
        id: i.id,
        listingId: i.listingId,
        listingAddress: listingMap.get(i.listingId) ?? "Unknown",
        name: i.name,
        email: i.email,
        message: i.message,
        createdAt: i.createdAt,
      }))
    );
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

/* ── Audit log ──────────────────────────────────────── */
router.get("/admin/audit-logs", async (req, res) => {
  try {
    requireAdmin(req);
    const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    res.json(logs.map((l) => ({
      ...l,
      details: l.details ? (() => { try { return JSON.parse(l.details!); } catch { return l.details; } })() : null,
    })));
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

/* ── Admin login (separate from normal login) ──────── */
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const bcrypt = (await import("bcryptjs")).default;
    const { eq } = await import("drizzle-orm");

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid admin credentials" });

    const token = makeAdminToken(user.id);

    await logAction({
      userId: user.id,
      userName: user.name,
      userRole: "admin",
      action: "admin.login",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email },
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "admin" as const,
        hasWebauthn: !!user.webauthnCredentialId,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Admin login failed");
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;
export { makeAdminToken };
