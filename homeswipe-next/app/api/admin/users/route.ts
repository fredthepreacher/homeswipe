import { desc } from "drizzle-orm";
import { dbAdmin } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/server-auth";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();
  if (authed.user.role !== "admin") return forbidden();

  try {
    const users = await dbAdmin
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        licenseState: usersTable.licenseState,
        brokerage: usersTable.brokerage,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    return Response.json(users.map((u) => ({ ...u, name: u.name ?? "Unnamed" })));
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
