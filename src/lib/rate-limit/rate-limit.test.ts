import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createMemoryStore } from "./memory-store";
import { createLimiter, limitKey } from "./shared-limiter";
import type { RateLimitStore } from "./types";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `rl${Date.now().toString(36)}`;
process.env.AUTH_SECRET ??= "x".repeat(40);

let db: () => import("@/generated/prisma/client").PrismaClient;
let pg: RateLimitStore;
const keys = (n: string) => limitKey(`${tag}-${n}`, "id");

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  db = (await import("@/lib/db")).db;
  pg = (await import("./postgres-store")).createPostgresStore({ sweepProbability: 0 });
});
after(async () => {
  if (!URL) return;
  await db().rateLimitBucket.deleteMany({ where: { key: { startsWith: tag } } });
  await db().$disconnect();
});

// ---- limiter behaviour (memory store, no DB) ----
test("limiter: allows `limit` hits, then blocks with retry-after; remaining counts down", async () => {
  const l = createLimiter({ scope: "t1", limit: 3, windowMs: 60_000, store: createMemoryStore() });
  const r = [await l.check("a"), await l.check("a"), await l.check("a"), await l.check("a")];
  assert.deepEqual(r.map(x => x.ok), [true, true, true, false]);
  assert.deepEqual(r.map(x => x.remaining), [2, 1, 0, 0]);
  assert.ok(r[3].retryAfterSec >= 1);
  assert.equal(r[0].retryAfterSec, 0);
});

test("limiter: identifiers and scopes are independent; reset forgets one", async () => {
  const store = createMemoryStore();
  const a = createLimiter({ scope: "s-a", limit: 1, windowMs: 60_000, store });
  const b = createLimiter({ scope: "s-b", limit: 1, windowMs: 60_000, store });
  assert.equal((await a.check("x")).ok, true);
  assert.equal((await a.check("x")).ok, false);
  assert.equal((await a.check("y")).ok, true, "other identifier");
  assert.equal((await b.check("x")).ok, true, "other scope");
  await a.reset("x");
  assert.equal((await a.check("x")).ok, true, "after reset");
});

test("limitKey: stable, scoped, and contains no raw identifier", () => {
  const k = limitKey("login-acct", "victim@uw.edu");
  assert.equal(k, limitKey("login-acct", "victim@uw.edu"));
  assert.notEqual(k, limitKey("login-ip", "victim@uw.edu"));
  assert.ok(k.startsWith("login-acct:") && !k.includes("victim") && !k.includes("uw.edu"));
  assert.ok(k.length <= 80);
  assert.notEqual(limitKey("s", "a\0b"), limitKey("s\0a", "b"), "scope/identifier boundary cannot be forged");
});

test("limiter: a failing shared store falls back to per-instance counting and still limits (never fails open)", async () => {
  const broken: RateLimitStore = { name: "broken", hit: async () => { throw new Error("db down"); }, reset: async () => { throw new Error("db down"); }, sweep: async () => 0 };
  const l = createLimiter({ scope: "t2", limit: 2, windowMs: 60_000, store: broken });
  const lines: string[] = []; const orig = console.error; console.error = (m: string) => { lines.push(String(m)); };
  try {
    assert.deepEqual([(await l.check("a")).ok, (await l.check("a")).ok, (await l.check("a")).ok], [true, true, false]);
    await assert.doesNotReject(l.reset("a"));
  } finally { console.error = orig; }
  assert.ok(lines.some(x => x.includes("ratelimit_store_unavailable")));
  assert.ok(!lines.join("").includes("db down"), "error message not logged");
});

test("memory store: window expiry and sweep", async () => {
  let t = 1000; const s = createMemoryStore(() => t);
  await s.hit("k", 1000); await s.hit("k", 1000);
  t = 2500; // window over
  assert.equal((await s.hit("k", 1000)).count, 1);
  t = 9000;
  assert.equal(await s.sweep(10), 1);
  assert.equal(s.size(), 0);
});

// ---- Postgres store (real database) ----
test("postgres: sequential hits count up and report retry-after", run, async () => {
  const k = keys("seq");
  const a = await pg.hit(k, 60_000), b = await pg.hit(k, 60_000);
  assert.deepEqual([a.count, b.count], [1, 2]);
  assert.ok(b.retryAfterSec >= 59 && b.retryAfterSec <= 60, `retryAfterSec=${b.retryAfterSec}`);
});

test("postgres: 100 concurrent hits are all counted exactly once (atomic, no lost updates)", run, async () => {
  const k = keys("conc");
  const results = await Promise.all(Array.from({ length: 100 }, () => pg.hit(k, 60_000)));
  const counts = results.map(r => r.count).sort((x, y) => x - y);
  assert.deepEqual(counts, Array.from({ length: 100 }, (_, i) => i + 1), "every caller saw a distinct count 1..100");
  assert.equal((await db().rateLimitBucket.findUniqueOrThrow({ where: { key: k } })).count, 100);
});

test("postgres: concurrent callers through the limiter admit exactly `limit` requests", run, async () => {
  const l = createLimiter({ scope: `${tag}-adm`, limit: 10, windowMs: 60_000, store: pg });
  const rs = await Promise.all(Array.from({ length: 60 }, () => l.check("same-ip")));
  assert.equal(rs.filter(r => r.ok).length, 10);
  assert.equal(rs.filter(r => !r.ok).length, 50);
});

test("postgres: two separate limiter instances share one counter (the multi-instance case)", run, async () => {
  const instanceA = createLimiter({ scope: `${tag}-shared`, limit: 5, windowMs: 60_000, store: pg });
  const instanceB = createLimiter({ scope: `${tag}-shared`, limit: 5, windowMs: 60_000, store: pg });
  const outcomes: boolean[] = [];
  for (let i = 0; i < 8; i++) outcomes.push((await (i % 2 ? instanceA : instanceB).check("user")).ok);
  assert.deepEqual(outcomes, [true, true, true, true, true, false, false, false]);
});

test("postgres: an expired window restarts at 1 (using the DB clock, not the app's)", run, async () => {
  const k = keys("exp");
  await pg.hit(k, 60_000); await pg.hit(k, 60_000);
  await db().$executeRaw`UPDATE "RateLimitBucket" SET "expiresAt" = now() - interval '1 second' WHERE "key" = ${k}`;
  assert.equal((await pg.hit(k, 60_000)).count, 1);
  const row = await db().rateLimitBucket.findUniqueOrThrow({ where: { key: k } });
  assert.ok(row.expiresAt.getTime() > Date.now() + 50_000, "new window opened");
});

test("postgres: expiry column is timestamptz, so now() comparisons never depend on a session time zone", run, async () => {
  const rows = await db().$queryRaw<{ data_type: string }[]>`SELECT data_type FROM information_schema.columns WHERE table_name = 'RateLimitBucket' AND column_name = 'expiresAt'`;
  assert.equal(rows[0]?.data_type, "timestamp with time zone");
  const tz = (await db().$queryRaw<{ s: string }[]>`SELECT current_setting('TimeZone') AS s`)[0].s;
  console.info(`# (info) database session time zone for this run: ${tz}`); // the suite deliberately runs on a non-UTC server
});

test("postgres: reset and independent keys", run, async () => {
  const a = keys("ra"), b = keys("rb");
  await pg.hit(a, 60_000); await pg.hit(a, 60_000); await pg.hit(b, 60_000);
  await pg.reset(a);
  assert.equal((await pg.hit(a, 60_000)).count, 1);
  assert.equal((await pg.hit(b, 60_000)).count, 2);
  await assert.doesNotReject(pg.reset(keys("never-existed")));
});

test("postgres: sweep removes only expired rows and respects the batch size", run, async () => {
  const dead = [1, 2, 3].map(i => keys(`dead${i}`)), live = keys("live");
  for (const k of [...dead, live]) await pg.hit(k, 60_000);
  await db().$executeRaw`UPDATE "RateLimitBucket" SET "expiresAt" = now() - interval '1 minute' WHERE "key" = ANY(${dead})`;
  assert.equal(await pg.sweep(2), 2, "batch size respected");
  assert.equal(await pg.sweep(100) >= 1, true);
  assert.equal(await db().rateLimitBucket.count({ where: { key: { in: dead } } }), 0);
  assert.equal(await db().rateLimitBucket.count({ where: { key: live } }), 1, "live row untouched");
});

test("postgres: the table never contains a raw identifier", run, async () => {
  const l = createLimiter({ scope: `${tag}-priv`, limit: 5, windowMs: 60_000, store: pg });
  await l.check("203.0.113.77"); await l.check("someone@uw.edu");
  const rows = await db().rateLimitBucket.findMany({ where: { key: { startsWith: `${tag}-priv` } } });
  assert.equal(rows.length, 2);
  assert.ok(!JSON.stringify(rows).includes("203.0.113.77") && !JSON.stringify(rows).includes("someone"));
});

test("postgres: opportunistic sweep fires and never breaks a hit", run, async () => {
  const always = (await import("./postgres-store")).createPostgresStore({ sweepProbability: 1 });
  const dead = keys("opp");
  await pg.hit(dead, 60_000);
  await db().$executeRaw`UPDATE "RateLimitBucket" SET "expiresAt" = now() - interval '1 minute' WHERE "key" = ${dead}`;
  assert.equal((await always.hit(keys("opp2"), 60_000)).count, 1);
  assert.equal(await db().rateLimitBucket.count({ where: { key: dead } }), 0, "dead row cleaned during an unrelated hit");
});
