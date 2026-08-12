import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { dbAdmin } from "@/lib/db";
import { usersTable } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { ensureUser, unauthorized } from "@/lib/server-auth";

const OnboardingBody = z.object({
  role: z.enum(["consumer", "broker", "landlord"]),
  licenseId: z.string().optional(),
  licenseState: z.string().optional(),
  brokerage: z.string().optional(),
  businessAddress: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return unauthorized();

  try {
    const body = OnboardingBody.parse(await request.json());

    // Ensure a DB row exists, then sync fields
    await ensureUser(userId);

    const cu = await currentUser();
    const name = cu
      ? (cu.firstName || cu.lastName ? `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim() : cu.username)
      : null;
    const email = cu?.primaryEmailAddress?.emailAddress ?? null;
    const phone = cu?.primaryPhoneNumber?.phoneNumber ?? null;

    await dbAdmin
      .update(usersTable)
      .set({
        role: body.role,
        name,
        email,
        phone,
        licenseId: body.licenseId ?? null,
        licenseState: body.licenseState ?? null,
        brokerage: body.brokerage ?? null,
        businessAddress: body.businessAddress ?? null,
      })
      .where(eq(usersTable.id, userId));

    // Mirror into Clerk publicMetadata AFTER the authoritative write. Postgres
    // is the source of truth (see /api/me); this copy exists only so the claims
    // are available in the session token for future JWT-based policies. A
    // failure here must not fail onboarding or roll back the real role.
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          role: body.role,
          licenseId: body.licenseId ?? null,
          licenseState: body.licenseState ?? null,
          brokerage: body.brokerage ?? null,
          businessAddress: body.businessAddress ?? null,
        },
      });
    } catch {
      // Mirror is best-effort; the database already holds the real role.
    }

    void logAction({
      userId,
      userName: name,
      userRole: body.role,
      action: "user.registered",
      entityType: "user",
      details: { role: body.role, email, phone },
    });

    return Response.json({ success: true, role: body.role });
  } catch (err: any) {
    if (err?.issues) return Response.json({ error: "Invalid onboarding data" }, { status: 400 });
    return Response.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
