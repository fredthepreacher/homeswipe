import { desc } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { auditLogsTable } from "@/lib/schema";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/server-auth";

export async function GET(request: Request) {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();
  if (authed.user.role !== "admin") return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const logs = await dbAdmin
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    return Response.json(
      logs.map((l) => ({
        ...l,
        details: l.details
          ? (() => { try { return JSON.parse(l.details!); } catch { return l.details; } })()
          : null,
      }))
    );
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
