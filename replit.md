# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Features

### HomeSweep — Real Estate Swipe App
- Tinder-style swipe interface for browsing property listings
- Full-screen property cards with drag gesture and physics rotation
- Swipe right to save, left to reject, with SAVE/PASS stamp overlays
- Action buttons: X (reject), Star (super-like), Heart (save)
- Bottom nav: Home, Search, Saved, Profile tabs
- 10 pre-seeded property listings from across the US
- Saved listings grid view, search/filter page, profile page
- Color scheme: white/light-blue/soft-gray

## User Roles & Routing
- **consumer** → `/` (swipe deck, search, saved/messages, profile)
- **broker / landlord** → `/broker` (dashboard, listings CRUD, messages, profile)
- **admin** → `/admin` (admin dashboard — dark indigo theme)

## Admin Feature
- Auto-seeded on first API server start: `admin@homesweep.com` / `Admin@HomeSweep1`
- 4-tab admin dashboard: Overview, Users, Listings, Audit Log
- Overview: live stats (total users, listings, inquiries, events today) + real-time activity feed polling every 15s
- Feed has side-filters: All / Consumer Side / Broker Side
- Users: searchable list of all accounts with role filter pills
- Listings: all listings from all brokers/landlords with property type filter
- Audit Log: full event trail with expandable JSON details, action-type filter

## Buyer Preferences Survey
- 5-step full-screen survey at `/preferences` (bottom nav hidden during survey)
- **Step 1 — Budget**: Renting vs Buying toggle, min/max inputs, quick-pick preset chips
- **Step 2 — Location**: city/neighborhood text input + "Add" button, popular city suggestions, added-chips with remove X
- **Step 3 — Timeline**: 5 big tap-cards (ASAP 🚀, 1-3 Months, 3-6 Months, 6+ Months, Just Browsing)
- **Step 4 — Home Size**: bedroom chips (Studio/1/2/3/4+) + property type cards (Apartment, House, Condo, Townhouse)
- **Step 5 — Amenities**: 3-col grid of 9 toggleable tiles (Pool, 1-Car Garage, 2-Car Garage, Pet Friendly, In-Unit Laundry, Gym, Backyard, Parking, Elevator)
- Each step has animated slide transitions, progress bar, and 5 step dots
- "Skip this step" on each step; "Save My Preferences" on last step
- Pre-fills from saved data when editing
- **Profile card**: rich summary card on `/profile` — Budget (green), Location (blue), Timeline (orange), Home Size (purple), Amenities (rose) colored sections; "Edit" button re-opens survey
- Empty state: "Set Your Preferences" prompt card with dashed border
- **DB**: `buyer_preferences` table (userId unique, budgetMin, budgetMax, budgetType, locations JSONB, moveTimeline, bedroomsMin, propertyTypes JSONB, amenities JSONB)
- **API**: `GET /api/preferences`, `PUT /api/preferences`
- **Frontend lib**: `artifacts/homesweep/src/lib/preferences-api.ts`

## Messaging (Match-Gated Inbox)
- **Match = right swipe**: "Message Agent" button only appears on saved (right-swiped) listings
- **Consumer** → `/saved` has two tabs: "Saved Homes" and "Messages"
  - Tap "Message Agent" on any saved card → creates/opens a conversation thread at `/messages/new/:listingId` or `/messages/:id`
  - Thread: full-screen chat UI, "✓ Matched" banner, poll every 5s, optimistic send, bottom nav hidden
  - Messages tab: conversation list with property thumbnail, address, last message, unread badge
- **Broker/Landlord** → bottom nav "Messages" tab → `/broker/messages` inbox
  - Shows all consumers who messaged about their listings
  - Thread at `/broker/messages/:id`: consumer name header, property banner, reply input, nav hidden
- **DB tables**: `conversations` (listingId + consumerId unique pair), `messages` (conversationId, senderId, content, readAt)
- **API**: `POST /api/conversations`, `GET /api/conversations`, `GET/POST /api/conversations/:id/messages`, `GET /api/broker/conversations`, `GET/POST /api/broker/conversations/:id/messages`
- **Frontend lib**: `artifacts/homesweep/src/lib/messages-api.ts` — `messagesApi` (consumer), `brokerMessagesApi` (broker)

## Audit Logging
Events logged to `audit_logs` table: `user.registered`, `user.login`, `listing.created`, `listing.deleted`, `inquiry.submitted`, `admin.login`
Helper: `artifacts/api-server/src/lib/audit.ts` — `logAction()` never throws (fire-and-forget)

## JWT Token
Token payload includes `{ userId, role }` — `requireAdmin` middleware checks `payload.role === "admin"`

## Packages

### `artifacts/homesweep` (`@workspace/homesweep`)
React + Vite frontend. Uses framer-motion for swipe animations, @use-gesture/react for gesture handling.
- Routes: `/` (swipe deck), Search, Saved, Profile
- API calls: GET /api/listings, POST /api/listings/:id/swipe, GET /api/saved

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
