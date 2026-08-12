import { desc } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { inquiriesTable, listingsTable } from "@/lib/schema";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/server-auth";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();
  if (authed.user.role !== "admin") return forbidden();

  try {
    const inquiries = await dbAdmin.select().from(inquiriesTable).orderBy(desc(inquiriesTable.createdAt));

    const listings = await dbAdmin
      .select({ id: listingsTable.id, address: listingsTable.address })
      .from(listingsTable);
    const listingMap = new Map(listings.map((l) => [l.id, l.address]));

    return Response.json(
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
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
