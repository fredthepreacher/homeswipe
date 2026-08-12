import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

let cached: Db | null = null;

function init(): Db {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is required but was not provided."
    );
  }

  if (connectionString.includes("REPLACE_ME")) {
    throw new Error(
      "DATABASE_URL is still the placeholder value. Set it to your Supabase " +
        "transaction-pooler connection string (port 6543)."
    );
  }

  // Vercel runs each request in a lambda instance that keeps its own pool, so
  // the per-instance cap has to stay small or Supavisor's client limit is
  // exhausted under modest concurrency. Point DATABASE_URL at the transaction
  // pooler (port 6543), not the direct connection (5432).
  const pool = new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  cached = drizzle(pool, { schema });
  return cached;
}

/**
 * Bypasses row-level security. Use only where a request legitimately acts
 * outside a single user's scope: admin endpoints (which do their own role
 * check), audit logging, and first-time user provisioning.
 *
 * Connection setup is deferred to first use. `next build` evaluates every route
 * module to collect page data, and validating eagerly at import time would make
 * a reachable database a build requirement.
 */
export const dbAdmin: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const db = init();
    const value = Reflect.get(db as object, prop, receiver);
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type JwtClaims = Record<string, unknown> & { sub: string };

/**
 * Runs `fn` with Postgres session state carrying the caller's JWT claims, so
 * RLS policies evaluate against the real user.
 *
 * The transaction is not optional. `set_config(..., true)` and `SET LOCAL ROLE`
 * are scoped to the surrounding transaction — issue the same queries outside
 * one and the claims never apply, RLS sees an anonymous caller, and reads come
 * back empty rather than erroring.
 */
export async function withClaims<T>(
  claims: JwtClaims,
  fn: (tx: Tx) => Promise<T>
): Promise<T> {
  return dbAdmin.transaction(async (tx) => {
    // Claims first: once the role is dropped to `authenticated` we no longer
    // want to depend on the connecting role's privileges.
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}
