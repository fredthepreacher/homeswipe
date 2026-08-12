import { z } from "zod";
import { eq } from "drizzle-orm";
import { listingsTable, usersTable } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { withUserDb, unauthorized } from "@/lib/server-auth";

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

function serialize(l: typeof listingsTable.$inferSelect) {
  return {
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
  };
}

export async function GET() {
  try {
    const res = await withUserDb(async (tx, userId) => {
      const listings = await tx
        .select()
        .from(listingsTable)
        .where(eq(listingsTable.ownerId, userId));
      return listings.map(serialize);
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch {
    return Response.json({ error: "Failed to get listings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = CreateListingBody.parse(await request.json());

    const res = await withUserDb(async (tx, userId) => {
      const [listing] = await tx
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

      // Own row is readable under RLS, so this stays inside the scoped tx.
      const [me] = await tx
        .select({ name: usersTable.name, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      return { listing, me };
    });

    if (!res) return unauthorized();
    const { listing, me } = res.data;

    void logAction({
      userId: res.userId,
      userName: me?.name ?? null,
      userRole: me?.role ?? null,
      action: "listing.created",
      entityType: "listing",
      entityId: listing.id,
      details: { address: listing.address, price: Number(listing.price), propertyType: listing.propertyType },
    });

    return Response.json(serialize(listing), { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid listing data" }, { status: 400 });
    return Response.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
