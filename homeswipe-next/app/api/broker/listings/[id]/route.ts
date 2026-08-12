import { and, eq } from "drizzle-orm";
import { listingsTable, usersTable } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { withUserDb, unauthorized } from "@/lib/server-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = Number(id);
    if (isNaN(listingId)) return Response.json({ error: "Invalid listing ID" }, { status: 400 });

    const res = await withUserDb(async (tx, userId) => {
      const [deleted] = await tx
        .delete(listingsTable)
        .where(and(eq(listingsTable.id, listingId), eq(listingsTable.ownerId, userId)))
        .returning();

      if (!deleted) return null;

      const [me] = await tx
        .select({ name: usersTable.name, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      return { deleted, me };
    });

    if (!res) return unauthorized();
    if (res.data === null) {
      return Response.json({ error: "Listing not found or not yours" }, { status: 404 });
    }

    const { deleted, me } = res.data;

    void logAction({
      userId: res.userId,
      userName: me?.name ?? null,
      userRole: me?.role ?? null,
      action: "listing.deleted",
      entityType: "listing",
      entityId: listingId,
      details: { address: deleted.address },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to delete listing" }, { status: 500 });
  }
}
