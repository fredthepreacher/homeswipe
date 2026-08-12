-- Row Level Security policies for HomeSwipe (Supabase + Clerk).
--
-- Run this AFTER `npm run db:push` creates the tables, against the DIRECT
-- connection (port 5432), not the transaction pooler.
--
-- Two things make this file different from a stock Supabase policy set:
--
--   1. auth.uid() is NOT usable here. It casts the `sub` claim to uuid, and our
--      users.id holds Clerk IDs like `user_2abc...` (text). Every policy below
--      reads auth.jwt()->>'sub' instead.
--   2. These policies only take effect for connections that have run
--      `SET LOCAL ROLE authenticated` with request.jwt.claims set — that is what
--      lib/db.ts withClaims() does. The dbAdmin client deliberately bypasses
--      them and is reserved for admin routes, audit logging, and user
--      provisioning.

-- ---------------------------------------------------------------------------
-- Base grants. RLS filters rows; it does not grant table access on its own.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- audit_logs is written only by the admin client. No app user should read or
-- write it directly, so the blanket grant above is revoked.
revoke all on table audit_logs from authenticated;

alter table users              enable row level security;
alter table listings           enable row level security;
alter table swipes             enable row level security;
alter table buyer_preferences  enable row level security;
alter table conversations      enable row level security;
alter table messages           enable row level security;
alter table inquiries          enable row level security;
alter table audit_logs         enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

-- Own row, plus the counterparty of any conversation you are part of — the
-- broker inbox needs consumer names and vice versa.
drop policy if exists users_select on users;
create policy users_select on users
  for select to authenticated
  using (
    id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from conversations c
      where (c.consumer_id = auth.jwt() ->> 'sub' and c.owner_id    = users.id)
         or (c.owner_id    = auth.jwt() ->> 'sub' and c.consumer_id = users.id)
    )
  );

drop policy if exists users_update_own on users;
create policy users_update_own on users
  for update to authenticated
  using      (id = auth.jwt() ->> 'sub')
  with check (id = auth.jwt() ->> 'sub');

-- No insert/delete policy: rows are provisioned by ensureUser() via dbAdmin,
-- and users must not be able to change their own `role`.

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

-- The listings feed is visible to every signed-in user.
drop policy if exists listings_select on listings;
create policy listings_select on listings
  for select to authenticated
  using (true);

drop policy if exists listings_insert_own on listings;
create policy listings_insert_own on listings
  for insert to authenticated
  with check (owner_id = auth.jwt() ->> 'sub');

drop policy if exists listings_update_own on listings;
create policy listings_update_own on listings
  for update to authenticated
  using      (owner_id = auth.jwt() ->> 'sub')
  with check (owner_id = auth.jwt() ->> 'sub');

drop policy if exists listings_delete_own on listings;
create policy listings_delete_own on listings
  for delete to authenticated
  using (owner_id = auth.jwt() ->> 'sub');

-- ---------------------------------------------------------------------------
-- swipes
-- ---------------------------------------------------------------------------

drop policy if exists swipes_select_own on swipes;
create policy swipes_select_own on swipes
  for select to authenticated
  using (user_id = auth.jwt() ->> 'sub');

drop policy if exists swipes_insert_own on swipes;
create policy swipes_insert_own on swipes
  for insert to authenticated
  with check (user_id = auth.jwt() ->> 'sub');

drop policy if exists swipes_delete_own on swipes;
create policy swipes_delete_own on swipes
  for delete to authenticated
  using (user_id = auth.jwt() ->> 'sub');

-- ---------------------------------------------------------------------------
-- buyer_preferences
-- ---------------------------------------------------------------------------

drop policy if exists prefs_select_own on buyer_preferences;
create policy prefs_select_own on buyer_preferences
  for select to authenticated
  using (user_id = auth.jwt() ->> 'sub');

drop policy if exists prefs_insert_own on buyer_preferences;
create policy prefs_insert_own on buyer_preferences
  for insert to authenticated
  with check (user_id = auth.jwt() ->> 'sub');

drop policy if exists prefs_update_own on buyer_preferences;
create policy prefs_update_own on buyer_preferences
  for update to authenticated
  using      (user_id = auth.jwt() ->> 'sub')
  with check (user_id = auth.jwt() ->> 'sub');

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------

-- Either side of the thread: the consumer, or the broker who owns the listing.
-- owner_id is nullable, so fall back to the listing's owner.
drop policy if exists conversations_select_party on conversations;
create policy conversations_select_party on conversations
  for select to authenticated
  using (
    consumer_id = auth.jwt() ->> 'sub'
    or owner_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from listings l
      where l.id = conversations.listing_id
        and l.owner_id = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists conversations_insert_consumer on conversations;
create policy conversations_insert_consumer on conversations
  for insert to authenticated
  with check (consumer_id = auth.jwt() ->> 'sub');

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

drop policy if exists messages_select_party on messages;
create policy messages_select_party on messages
  for select to authenticated
  using (
    exists (
      select 1 from conversations c
      left join listings l on l.id = c.listing_id
      where c.id = messages.conversation_id
        and (
          c.consumer_id = auth.jwt() ->> 'sub'
          or c.owner_id = auth.jwt() ->> 'sub'
          or l.owner_id = auth.jwt() ->> 'sub'
        )
    )
  );

-- You may only post as yourself, and only into a thread you belong to.
drop policy if exists messages_insert_party on messages;
create policy messages_insert_party on messages
  for insert to authenticated
  with check (
    sender_id = auth.jwt() ->> 'sub'
    and exists (
      select 1 from conversations c
      left join listings l on l.id = c.listing_id
      where c.id = messages.conversation_id
        and (
          c.consumer_id = auth.jwt() ->> 'sub'
          or c.owner_id = auth.jwt() ->> 'sub'
          or l.owner_id = auth.jwt() ->> 'sub'
        )
    )
  );

-- Read receipts. Restricted to the read_at column by the app; RLS just keeps
-- the update inside threads you belong to.
drop policy if exists messages_update_party on messages;
create policy messages_update_party on messages
  for update to authenticated
  using (
    exists (
      select 1 from conversations c
      left join listings l on l.id = c.listing_id
      where c.id = messages.conversation_id
        and (
          c.consumer_id = auth.jwt() ->> 'sub'
          or c.owner_id = auth.jwt() ->> 'sub'
          or l.owner_id = auth.jwt() ->> 'sub'
        )
    )
  );

-- ---------------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------------

-- Only the broker who owns the listing can read inquiries against it.
drop policy if exists inquiries_select_owner on inquiries;
create policy inquiries_select_owner on inquiries
  for select to authenticated
  using (
    exists (
      select 1 from listings l
      where l.id = inquiries.listing_id
        and l.owner_id = auth.jwt() ->> 'sub'
    )
  );

-- Any signed-in user may submit one.
drop policy if exists inquiries_insert on inquiries;
create policy inquiries_insert on inquiries
  for insert to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------

-- No policies. RLS is enabled and privileges are revoked, so the table is
-- unreachable from an `authenticated` connection and readable only via dbAdmin
-- (which the /api/admin routes gate on users.role = 'admin').
