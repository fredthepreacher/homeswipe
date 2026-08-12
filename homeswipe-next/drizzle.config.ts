import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local for the app, but drizzle-kit is a separate CLI and
// does not. Parse it here so `npm run db:push` works without extra ceremony.
// Existing process env wins, so CI can override without editing files.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // No .env.local (CI, or env supplied some other way) — fall through.
}

// Migrations run over the session pooler (port 5432). DDL through the
// transaction pooler that DATABASE_URL points at is unreliable, so prefer
// DIRECT_URL and only fall back when it is absent.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error("DIRECT_URL (preferred) or DATABASE_URL must be set to run migrations.");
}

export default defineConfig({
  schema: "./lib/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
