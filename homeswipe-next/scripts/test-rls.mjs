/**
 * Row Level Security regression suite.
 *
 * Exercises the policies in drizzle/policies.sql the same way the app does:
 * inside a transaction with request.jwt.claims set and the role dropped to
 * `authenticated`. Anything that passes here is enforced by Postgres itself,
 * independent of the application-layer checks in the route handlers.
 *
 * Uses its own throwaway fixtures (ids prefixed rlstest_) and cleans up after
 * itself. Safe to run against a database with real data — it never touches
 * rows it did not create.
 *
 * Run: npm run test:rls
 */
import { Client } from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL must be set.");
  process.exit(1);
}

const c = new Client({ connectionString: url });

const ALICE = "rlstest_alice";   // broker, owns the fixture listing
const BOB = "rlstest_bob";       // consumer
const MALLORY = "rlstest_mal";   // unrelated consumer

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`);
  }
}

/** Mirrors lib/db.ts withClaims(): claims first, then drop the role. */
async function asUser(sub, fn) {
  await c.query("begin");
  try {
    await c.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub, role: "authenticated" }),
    ]);
    await c.query("set local role authenticated");
    return await fn();
  } finally {
    await c.query("rollback");
  }
}

/**
 * A failed statement poisons the transaction, which would make every later
 * assertion fail for the wrong reason. Savepoint each expected failure.
 */
async function expectDenied(name, sql, params = []) {
  await c.query("savepoint sp");
  try {
    await c.query(sql, params);
    await c.query("rollback to savepoint sp");
    check(name, false, "statement unexpectedly succeeded");
  } catch (e) {
    await c.query("rollback to savepoint sp");
    check(name, true, e.message.split("\n")[0]);
  }
}

async function seedFixtures() {
  await c.query(
    `insert into users (id, role, name, email) values
       ($1,'broker','RLS Alice','alice@rlstest.local'),
       ($2,'consumer','RLS Bob','bob@rlstest.local'),
       ($3,'consumer','RLS Mallory','mal@rlstest.local')
     on conflict (id) do nothing`,
    [ALICE, BOB, MALLORY]
  );

  const { rows: [listing] } = await c.query(
    `insert into listings
       (owner_id, price, address, city, state, bedrooms, bathrooms, sqft, image_url, property_type, description)
     values ($1, 100, 'RLS Fixture St', 'Manhattan','NY',1,1,500,'https://x/y.jpg','Condo','fixture')
     returning id`,
    [ALICE]
  );

  await c.query(
    `insert into buyer_preferences (user_id, budget_max) values ($1, 111), ($2, 222)
     on conflict (user_id) do nothing`,
    [ALICE, BOB]
  );

  const { rows: [convo] } = await c.query(
    `insert into conversations (listing_id, consumer_id, owner_id) values ($1,$2,$3) returning id`,
    [listing.id, BOB, ALICE]
  );

  // Two unread messages from Bob (consumer) and one from Alice (broker), so
  // unread counts differ by viewer and a perspective bug cannot pass.
  await c.query(
    `insert into messages (conversation_id, sender_id, content) values
       ($1,$2,'from bob 1'), ($1,$2,'from bob 2'), ($1,$3,'from alice 1')`,
    [convo.id, BOB, ALICE]
  );

  await c.query(
    `insert into inquiries (listing_id, name, email, message)
     values ($1,'Bob','bob@rlstest.local','interested')`,
    [listing.id]
  );

  return { listingId: listing.id, convoId: convo.id };
}

async function cleanup() {
  await c.query(`delete from messages where sender_id like 'rlstest_%'`);
  await c.query(
    `delete from messages where conversation_id in
       (select c.id from conversations c join listings l on l.id = c.listing_id
        where l.owner_id like 'rlstest_%')`
  );
  await c.query(
    `delete from conversations where consumer_id like 'rlstest_%' or owner_id like 'rlstest_%'`
  );
  await c.query(
    `delete from inquiries where listing_id in (select id from listings where owner_id like 'rlstest_%')`
  );
  await c.query(
    `delete from swipes where user_id like 'rlstest_%' or listing_id in
       (select id from listings where owner_id like 'rlstest_%')`
  );
  await c.query(`delete from buyer_preferences where user_id like 'rlstest_%'`);
  await c.query(`delete from listings where owner_id like 'rlstest_%'`);
  await c.query(`delete from users where id like 'rlstest_%'`);
}

(async () => {
  await c.connect();
  await cleanup(); // clear leftovers from an interrupted prior run
  const { listingId, convoId } = await seedFixtures();

  console.log("\nisolation — consumer (bob)");
  await asUser(BOB, async () => {
    const prefs = await c.query("select user_id from buyer_preferences");
    check(
      "sees only own preferences",
      prefs.rows.length === 1 && prefs.rows[0].user_id === BOB,
      `saw ${prefs.rows.map((r) => r.user_id).join(",")}`
    );

    const users = await c.query("select id from users where id like 'rlstest_%'");
    const ids = users.rows.map((r) => r.id).sort();
    check(
      "sees self and conversation counterparty only",
      ids.length === 2 && ids.includes(BOB) && ids.includes(ALICE),
      `saw ${ids.join(",")}`
    );

    const feed = await c.query("select id from listings where id = $1", [listingId]);
    check("can read the public listings feed", feed.rows.length === 1);

    const msgs = await c.query("select id from messages where conversation_id = $1", [convoId]);
    check("can read own conversation's messages", msgs.rows.length === 3);
  });

  console.log("\nisolation — unrelated consumer (mallory)");
  await asUser(MALLORY, async () => {
    const convos = await c.query("select id from conversations where id = $1", [convoId]);
    check("cannot see someone else's conversation", convos.rows.length === 0);

    const msgs = await c.query("select id from messages where conversation_id = $1", [convoId]);
    check("cannot read someone else's messages", msgs.rows.length === 0);

    const inq = await c.query(
      "select id from inquiries where listing_id = $1",
      [listingId]
    );
    check("cannot read inquiries on a listing she does not own", inq.rows.length === 0);

    const prefs = await c.query("select user_id from buyer_preferences");
    check("cannot read others' preferences", prefs.rows.length === 0);
  });

  console.log("\nwrite protection — consumer (bob)");
  await asUser(BOB, async () => {
    await expectDenied(
      "cannot create a listing owned by someone else",
      `insert into listings (owner_id, price, address, city, state, bedrooms, bathrooms, sqft, image_url, property_type, description)
       values ($1, 1, 'spoof', 'Manhattan','NY',1,1,1,'https://x/y.jpg','Condo','x')`,
      [ALICE]
    );

    await expectDenied(
      "cannot post a message as another user",
      `insert into messages (conversation_id, sender_id, content) values ($1,$2,'forged')`,
      [convoId, ALICE]
    );

    await expectDenied(
      "cannot write preferences for another user",
      `insert into buyer_preferences (user_id, budget_max) values ($1, 999)`,
      [MALLORY]
    );

    await expectDenied("cannot read audit_logs", "select * from audit_logs limit 1");
    await expectDenied(
      "cannot write audit_logs",
      "insert into audit_logs (action) values ('forged')"
    );

    const upd = await c.query("update users set name = 'hacked' where id = $1", [ALICE]);
    check("cannot modify another user's row", upd.rowCount === 0, `${upd.rowCount} rows`);

    const del = await c.query("delete from listings where id = $1", [listingId]);
    check("cannot delete a listing he does not own", del.rowCount === 0, `${del.rowCount} rows`);
  });

  // Unread is relative to the viewer: messages someone else sent me that I
  // have not read. Serving both inboxes from one hardcoded perspective made
  // the broker's badge count their own outgoing messages.
  console.log("\nunread counts are viewer-relative");
  const unreadFor = (viewer) =>
    asUser(viewer, async () => {
      const r = await c.query(
        `select count(*)::int n from messages
         where conversation_id = $1 and sender_id <> $2 and read_at is null`,
        [convoId, viewer]
      );
      return r.rows[0].n;
    });

  const bobUnread = await unreadFor(BOB);
  const aliceUnread = await unreadFor(ALICE);
  check("consumer counts only the broker's messages", bobUnread === 1, `got ${bobUnread}, want 1`);
  check("broker counts only the consumer's messages", aliceUnread === 2, `got ${aliceUnread}, want 2`);
  check("the two perspectives differ", bobUnread !== aliceUnread, `both ${bobUnread}`);

  console.log("\nowner access — broker (alice)");
  await asUser(ALICE, async () => {
    const own = await c.query("select id from listings where owner_id = $1", [ALICE]);
    check("sees own listings", own.rows.length === 1);

    const inq = await c.query("select id from inquiries where listing_id = $1", [listingId]);
    check("sees inquiries on own listing", inq.rows.length === 1);

    const convos = await c.query("select id from conversations where id = $1", [convoId]);
    check("sees conversations on own listing", convos.rows.length === 1);

    const msgs = await c.query("select id from messages where conversation_id = $1", [convoId]);
    check("sees messages in own listing's thread", msgs.rows.length === 3);
  });

  await cleanup();
  await c.end();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(async (e) => {
  console.error("\nsuite error:", e.message);
  try {
    await cleanup();
    await c.end();
  } catch {}
  process.exit(1);
});
