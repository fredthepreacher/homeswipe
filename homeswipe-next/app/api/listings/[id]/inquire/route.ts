import { z } from "zod";
import { eq } from "drizzle-orm";
import { inquiriesTable, listingsTable } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { withUserDb, unauthorized } from "@/lib/server-auth";

const InquiryBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = Number(id);
    if (isNaN(listingId)) return Response.json({ error: "Invalid listing ID" }, { status: 400 });

    const body = InquiryBody.parse(await request.json());

    const res = await withUserDb(async (tx) => {
      // /api/broker/inquiries surfaces inquiries by joining through
      // listings.owner_id, so one filed against an ownerless listing is
      // unreachable for every broker. Reject rather than accept it into a
      // black hole.
      const [listing] = await tx
        .select({ ownerId: listingsTable.ownerId })
        .from(listingsTable)
        .where(eq(listingsTable.id, listingId));

      if (!listing) return { notFound: true as const };
      if (!listing.ownerId) return { unclaimed: true as const };

      const [inquiry] = await tx
        .insert(inquiriesTable)
        .values({ listingId, name: body.name, email: body.email, message: body.message })
        .returning();
      return { inquiry };
    });

    if (!res) return unauthorized();
    if ("notFound" in res.data) {
      return Response.json({ error: "Listing not found" }, { status: 404 });
    }
    if ("unclaimed" in res.data) {
      return Response.json(
        { error: "This listing has no agent to contact yet." },
        { status: 409 }
      );
    }

    void logAction({
      userId: res.userId,
      action: "inquiry.submitted",
      entityType: "listing",
      entityId: listingId,
      details: { name: body.name, email: body.email, listingId },
    });

    return Response.json({ id: res.data.inquiry.id, success: true }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid inquiry data" }, { status: 400 });
    return Response.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
