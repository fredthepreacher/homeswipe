import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL    = process.env["ADMIN_EMAIL"]    ?? "admin@homesweep.com";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "Admin@HomeSweep1";
const ADMIN_NAME     = "HomeSweep Admin";

export async function seedAdminUser() {
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) return;

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.insert(usersTable).values({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Admin account created");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  }
}
