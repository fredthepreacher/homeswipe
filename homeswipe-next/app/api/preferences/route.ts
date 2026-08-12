import { z } from "zod";
import { eq } from "drizzle-orm";
import { buyerPreferencesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

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

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const [prefs] = await tx
        .select()
        .from(buyerPreferencesTable)
        .where(eq(buyerPreferencesTable.userId, userId));
      return prefs ?? null;
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = PreferencesBody.parse(await request.json());

    const res = await withUserDb(async (tx, userId) => {
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

      const [result] = await tx
        .insert(buyerPreferencesTable)
        .values(payload)
        .onConflictDoUpdate({ target: buyerPreferencesTable.userId, set: payload })
        .returning();

      return result;
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid preferences data" }, { status: 400 });
    return Response.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
