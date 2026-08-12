import { getAuthedUser, unauthorized } from "@/lib/server-auth";

/**
 * The caller's own user record. This is the single source of truth for role on
 * the client — Clerk publicMetadata is only a mirror (see /api/onboarding), and
 * reading it directly is what allowed the two to drift.
 */
export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return unauthorized();

  const { user } = authed;
  return Response.json({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    licenseId: user.licenseId,
    licenseState: user.licenseState,
    brokerage: user.brokerage,
    businessAddress: user.businessAddress,
  });
}
