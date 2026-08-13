import { z } from "zod";
import { swipesTable } from "@/lib/schema";
import { withUserDb, unauthorized } from "@/lib/server-auth";

const SwipeBody = z.object({ direction: z.enum(["left", "right"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id, 10);
    if (Number.isNaN(listingId)) {
      return Response.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const body = SwipeBody.parse(await request.json());

    const res = await withUserDb(async (tx, userId) => {
      // One row per user per listing. A plain insert appended a new row on
      // every re-swipe, so the table grew without bound and a user who changed
      // their mind left contradictory rows behind.
      await tx
        .insert(swipesTable)
        .values({ userId, listingId, direction: body.direction })
        .onConflictDoUpdate({
          target: [swipesTable.userId, swipesTable.listingId],
          set: { direction: body.direction, createdAt: new Date() },
        });
      return { success: true, saved: body.direction === "right" };
    });

    if (!res) return unauthorized();
    return Response.json(res.data);
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid swipe data" }, { status: 400 });
    return Response.json({ error: "Failed to record swipe" }, { status: 500 });
  }
}
