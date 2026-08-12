import { count, gte } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { usersTable, listingsTable, inquiriesTable, auditLogsTable } from "@/lib/schema";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/server-auth";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();
  if (authed.user.role !== "admin") return forbidden();

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [[totalUsers], [totalListings], [totalInquiries], [eventsToday]] = await Promise.all([
      dbAdmin.select({ count: count() }).from(usersTable),
      dbAdmin.select({ count: count() }).from(listingsTable),
      dbAdmin.select({ count: count() }).from(inquiriesTable),
      dbAdmin.select({ count: count() }).from(auditLogsTable).where(gte(auditLogsTable.createdAt, todayStart)),
    ]);

    const usersByRole = await dbAdmin
      .select({ role: usersTable.role, count: count() })
      .from(usersTable)
      .groupBy(usersTable.role);

    return Response.json({
      totalUsers: totalUsers.count,
      totalListings: totalListings.count,
      totalInquiries: totalInquiries.count,
      eventsToday: eventsToday.count,
      usersByRole,
    });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
