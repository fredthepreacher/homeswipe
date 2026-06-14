import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { buyerPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const JWT_SECRET = process.env["JWT_SECRET"] || "homesweep-jwt-dev-secret-2025";

function requireAuth(req: any): number {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number };
  return payload.userId;
}

const AmenitiesSchema = z.object({
  pool:          z.boolean(),
  petFriendly:   z.boolean(),
  inUnitLaundry: z.boolean(),
  gym:           z.boolean(),
  yard:          z.boolean(),
  parking:       z.boolean(),
  elevator:      z.boolean(),
  garageType:    z.enum(["none", "1-car", "2-car"]),
});

const PreferencesBody = z.object({
  budgetMin:     z.number().int().min(0).nullable().optional(),
  budgetMax:     z.number().int().min(0).nullable().optional(),
  budgetType:    z.enum(["rent", "purchase"]).nullable().optional(),
  locations:     z.array(z.string()).nullable().optional(),
  moveTimeline:  z.enum(["asap", "1-3m", "3-6m", "6m+", "browsing"]).nullable().optional(),
  bedroomsMin:   z.number().int().min(0).nullable().optional(),
  propertyTypes: z.array(z.string()).nullable().optional(),
  amenities:     AmenitiesSchema.nullable().optional(),
});

/** GET /preferences */
router.get("/preferences", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const [prefs] = await db.select().from(buyerPreferencesTable)
      .where(eq(buyerPreferencesTable.userId, userId));
    res.json(prefs ?? null);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "GET /preferences");
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

/** PUT /preferences */
router.put("/preferences", async (req, res) => {
  try {
    const userId = requireAuth(req);
    const data   = PreferencesBody.parse(req.body);

    const existing = await db.select({ id: buyerPreferencesTable.id })
      .from(buyerPreferencesTable).where(eq(buyerPreferencesTable.userId, userId));

    const payload = {
      userId,
      budgetMin:     data.budgetMin    ?? null,
      budgetMax:     data.budgetMax    ?? null,
      budgetType:    data.budgetType   ?? null,
      locations:     data.locations    ?? null,
      moveTimeline:  data.moveTimeline ?? null,
      bedroomsMin:   data.bedroomsMin  ?? null,
      propertyTypes: data.propertyTypes ?? null,
      amenities:     data.amenities    ?? null,
      updatedAt:     new Date(),
    };

    let result;
    if (existing.length > 0) {
      [result] = await db.update(buyerPreferencesTable)
        .set(payload)
        .where(eq(buyerPreferencesTable.userId, userId))
        .returning();
    } else {
      [result] = await db.insert(buyerPreferencesTable)
        .values(payload)
        .returning();
    }

    res.json(result);
  } catch (err: any) {
    if (err.message === "Unauthorized") return res.status(401).json({ error: "Unauthorized" });
    req.log.error({ err }, "PUT /preferences");
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

export default router;
