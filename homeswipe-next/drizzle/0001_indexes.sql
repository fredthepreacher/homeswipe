-- Indexes backing the app's actual access patterns.
--
-- Postgres does not index foreign keys automatically, and this schema had none
-- beyond primary keys. Every broker-scoped query, the consumer feed, thread
-- loading, and — most expensively — the EXISTS subqueries inside the RLS
-- policies were doing sequential scans.
--
-- Written as explicit DDL rather than `drizzle-kit push` so the exact
-- statements applied to a live database are reviewable. Idempotent: safe to
-- re-run.
--
-- At current row counts these complete instantly. Once the tables are large,
-- prefer CREATE INDEX CONCURRENTLY (cannot run inside a transaction block) so
-- writes are not blocked while the index builds.

-- listings ------------------------------------------------------------------
-- owner_id: broker listing/conversation/inquiry queries, plus the owner checks
-- in the conversations, inquiries, and messages policies.
create index if not exists listings_owner_id_idx on listings (owner_id);
-- city: the consumer feed is Manhattan-scoped for launch.
create index if not exists listings_city_idx on listings (city);

-- swipes --------------------------------------------------------------------
-- Saved listings filter by (user, direction); the feed filters by user alone,
-- which this composite still serves via its leading column.
create index if not exists swipes_user_id_direction_idx on swipes (user_id, direction);
create index if not exists swipes_listing_id_idx on swipes (listing_id);

-- One swipe per user per listing. Without this, re-swiping appended a row every
-- time: unbounded growth plus contradictory rows when a user changed their mind.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'swipes_user_id_listing_id_unique'
  ) then
    alter table swipes
      add constraint swipes_user_id_listing_id_unique unique (user_id, listing_id);
  end if;
end $$;

-- conversations -------------------------------------------------------------
-- consumer_id: consumer inbox and the consumer branch of the RLS policies.
create index if not exists conversations_consumer_id_idx on conversations (consumer_id);
-- owner_id: broker inbox, the owner branch of the policies, and the
-- users_select policy that resolves conversation counterparties.
create index if not exists conversations_owner_id_idx on conversations (owner_id);
-- listing_id is already covered as the leading column of the existing
-- (listing_id, consumer_id) unique constraint.

-- messages ------------------------------------------------------------------
-- Thread loading orders by created_at within a conversation; the inbox's
-- last-message lookup uses the same ordering.
create index if not exists messages_conversation_id_created_at_idx
  on messages (conversation_id, created_at);
-- Read receipts filter by sender within a conversation.
create index if not exists messages_sender_id_idx on messages (sender_id);

-- inquiries -----------------------------------------------------------------
-- Broker inquiry list joins through listing ownership; the RLS policy performs
-- the same lookup per row.
create index if not exists inquiries_listing_id_idx on inquiries (listing_id);

-- audit_logs ----------------------------------------------------------------
-- The admin log orders by recency and the stats endpoint counts today's rows.
-- This is the fastest-growing table in the schema.
create index if not exists audit_logs_created_at_idx on audit_logs (created_at);
