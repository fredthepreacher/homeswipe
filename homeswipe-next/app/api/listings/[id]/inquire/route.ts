import { z } from "zod";
import { inquiriesTable } from "@/lib/schema";
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
      const [inquiry] = await tx
        .insert(inquiriesTable)
        .values({ listingId, name: body.name, email: body.email, message: body.message })
        .returning();
      return inquiry;
    });

    if (!res) return unauthorized();

    void logAction({
      userId: res.userId,
      action: "inquiry.submitted",
      entityType: "listing",
      entityId: listingId,
      details: { name: body.name, email: body.email, listingId },
    });

    return Response.json({ id: res.data.id, success: true }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid inquiry data" }, { status: 400 });
    return Response.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
