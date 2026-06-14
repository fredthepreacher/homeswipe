import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { listingsTable, inquiriesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logAction } from "../lib/audit";

const router: IRouter = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "homesweep-jwt-dev-secret-2025";

function requireAuth(req: any): number {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
  return payload.userId;
}

const CreateListingBody = z.object({
  price: z.number().positive(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().positive(),
  sqft: z.number().int().positive(),
  imageUrl: z.string().url(),
  propertyType: z.enum(["Apartment", "House", "Condo", "Townhouse"]),
  subtype: z.string().optional(),
  description: z.string().min(1),
});

const InquiryBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

router.get("/broker/listings", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const listings = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.ownerId, userId));

    res.json(listings.map((l) => ({
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
    })));
  } catch (err: any) {
    if (err?.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "Get broker listings failed");
    res.status(500).json({ error: "Failed to get listings" });
  }
});

router.post("/broker/listings", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const body = CreateListingBody.parse(req.body);

    const [listing] = await db
      .insert(listingsTable)
      .values({
        ownerId: userId,
        price: body.price.toString(),
        address: body.address,
        city: body.city,
        state: body.state,
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms.toString(),
        sqft: body.sqft,
        imageUrl: body.imageUrl,
        propertyType: body.propertyType,
        subtype: body.subtype,
        description: body.description,
      })
      .returning();

    res.status(201).json({
      id: listing.id,
      price: Number(listing.price),
      address: listing.address,
      city: listing.city,
      state: listing.state,
      bedrooms: listing.bedrooms,
      bathrooms: Number(listing.bathrooms),
      sqft: listing.sqft,
      imageUrl: listing.imageUrl,
      propertyType: listing.propertyType,
      subtype: listing.subtype ?? null,
      description: listing.description,
      createdAt: listing.createdAt,
    });

    const [owner] = await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    logAction({
      userId,
      userName: owner?.name ?? null,
      userRole: owner?.role ?? null,
      action: "listing.created",
      entityType: "listing",
      entityId: listing.id,
      details: { address: listing.address, price: Number(listing.price), propertyType: listing.propertyType },
      ipAddress: req.ip,
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    if (err?.issues) return res.status(400).json({ error: "Invalid listing data" });
    req.log.error({ err }, "Create broker listing failed");
    res.status(500).json({ error: "Failed to create listing" });
  }
});

router.delete("/broker/listings/:id", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const listingId = Number(req.params["id"]);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid listing ID" });

    const [deleted] = await db
      .delete(listingsTable)
      .where(and(eq(listingsTable.id, listingId), eq(listingsTable.ownerId, userId)))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Listing not found or not yours" });
    res.json({ success: true });

    const [owner] = await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    logAction({
      userId,
      userName: owner?.name ?? null,
      userRole: owner?.role ?? null,
      action: "listing.deleted",
      entityType: "listing",
      entityId: listingId,
      details: { address: deleted.address },
      ipAddress: req.ip,
    });
  } catch (err: any) {
    if (err?.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "Delete listing failed");
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

router.get("/broker/inquiries", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const myListings = await db
      .select({ id: listingsTable.id, address: listingsTable.address })
      .from(listingsTable)
      .where(eq(listingsTable.ownerId, userId));

    if (myListings.length === 0) {
      return res.json([]);
    }

    const listingIds = myListings.map((l) => l.id);
    const listingMap = new Map(myListings.map((l) => [l.id, l.address]));

    const allInquiries = await db.select().from(inquiriesTable);
    const filtered = allInquiries
      .filter((i) => listingIds.includes(i.listingId))
      .map((i) => ({
        id: i.id,
        listingId: i.listingId,
        listingAddress: listingMap.get(i.listingId) ?? "",
        name: i.name,
        email: i.email,
        message: i.message,
        createdAt: i.createdAt,
      }));

    res.json(filtered);
  } catch (err: any) {
    if (err?.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "Get inquiries failed");
    res.status(500).json({ error: "Failed to get inquiries" });
  }
});

router.post("/listings/:id/inquire", async (req, res) => {
  try {
    const listingId = Number(req.params["id"]);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid listing ID" });

    const body = InquiryBody.parse(req.body);

    const [inquiry] = await db
      .insert(inquiriesTable)
      .values({ listingId, name: body.name, email: body.email, message: body.message })
      .returning();

    res.status(201).json({ id: inquiry.id, success: true });

    logAction({
      action: "inquiry.submitted",
      entityType: "listing",
      entityId: listingId,
      details: { name: body.name, email: body.email, listingId },
      ipAddress: req.ip,
    });
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: "Invalid inquiry data" });
    req.log.error({ err }, "Create inquiry failed");
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
});

export default router;
