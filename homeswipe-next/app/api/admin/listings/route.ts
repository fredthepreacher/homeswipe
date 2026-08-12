import { desc } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { listingsTable, usersTable } from "@/lib/schema";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/server-auth";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();
  if (authed.user.role !== "admin") return forbidden();

  try {
    const listings = await dbAdmin.select().from(listingsTable).orderBy(desc(listingsTable.createdAt));

    const owners = await dbAdmin.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    const ownerMap = new Map(owners.map((o) => [o.id, o.name ?? "Unknown"]));

    return Response.json(
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
        ownerName: l.ownerId ? (ownerMap.get(l.ownerId) ?? "Unknown") : "HomeSwipe (seeded)",
      }))
    );
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
