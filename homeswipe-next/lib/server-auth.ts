import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { dbAdmin, withClaims, type Tx } from "./db";
import { usersTable, type User } from "./schema";

/**
 * Provisions the local row backing a Clerk user. Runs with dbAdmin because the
 * row must exist before there is anything for RLS to match against.
 */
export async function ensureUser(userId: string): Promise<User> {
  const existing = await dbAdmin
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const cu = await currentUser();
  const name = cu
    ? (cu.firstName || cu.lastName
        ? `${cu.firstName ?? ""} ${cu.lastName ?? ""}`.trim()
        : cu.username)
    : null;

  const [created] = await dbAdmin
    .insert(usersTable)
    .values({
      id: userId,
      role: "consumer",
      name,
      email: cu?.primaryEmailAddress?.emailAddress ?? null,
      phone: cu?.primaryPhoneNumber?.phoneNumber ?? null,
      licenseId: null,
      licenseState: null,
      brokerage: null,
      businessAddress: null,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [row] = await dbAdmin
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row;
}

export async function getAuthedUser(): Promise<{ userId: string; user: User } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await ensureUser(userId);
  if (!user) return null;

  return { userId, user };
}

/**
 * Runs `fn` against an RLS-scoped connection carrying the caller's Clerk
 * claims. Resolves to null only when there is no session, so callers can
 * respond 401 — the handler's own value is wrapped in `data` so that a
 * legitimate null result stays distinguishable from "not signed in".
 *
 * `sessionClaims` comes from Clerk's middleware, which has already verified the
 * token signature — we are forwarding a verified payload, not trusting input.
 * `role: "authenticated"` must also be present on the Clerk session token
 * itself for Supabase's third-party auth to accept it.
 */
export async function withUserDb<T>(
  fn: (tx: Tx, userId: string) => Promise<T>
): Promise<{ userId: string; data: T } | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const data = await withClaims(
    { ...(sessionClaims as Record<string, unknown>), sub: userId, role: "authenticated" },
    (tx) => fn(tx, userId)
  );

  return { userId, data };
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
