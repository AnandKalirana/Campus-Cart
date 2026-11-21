import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
process.env.AUTH_SECRET ??= "x".repeat(40);

import { createMemoryStore } from "@/lib/rate-limit/memory-store";
import { __setDefaultStoreForTests } from "@/lib/rate-limit/shared-limiter";

// Generated per run: a literal here trips secret scanners, and a fixed value would hide nothing.
const SECRET = `t-${randomBytes(16).toString("hex")}`;
const call = async (auth?: string) => (await import("./route")).GET(new Request("http://localhost/api/cron/rate-limit-cleanup", { headers: auth ? { authorization: auth } : {} }));
let prev: string | undefined; const quiet = console.error; const quietInfo = console.info;
beforeEach(() => { prev = process.env.CRON_SECRET; console.error = () => {}; console.info = () => {}; });
afterEach(() => { if (prev === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev; console.error = quiet; console.info = quietInfo; __setDefaultStoreForTests(undefined); });

test("cron cleanup: off (503) without CRON_SECRET or with a weak one, never open", async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await call(`Bearer ${SECRET}`)).status, 503);
  process.env.CRON_SECRET = "short";
  assert.equal((await call("Bearer short")).status, 503);
});

test("cron cleanup: rejects missing, wrong, different-length and non-bearer credentials", async () => {
  process.env.CRON_SECRET = SECRET;
  for (const a of [undefined, "", `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(0, -1)}`, "Bearer wrong-wrong-wrong-wrong-wrong", SECRET, `Basic ${SECRET}`]) {
    const r = await call(a);
    assert.equal(r.status, 401, String(a));
    assert.ok(!JSON.stringify(await r.json()).includes(SECRET));
  }
});

test("cron cleanup: the right secret sweeps expired entries and reports the count", async () => {
  process.env.CRON_SECRET = SECRET;
  let t = 0; const s = createMemoryStore(() => t);
  await s.hit("a", 1000); await s.hit("b", 1000); await s.hit("c", 100_000);
  t = 5000; __setDefaultStoreForTests(s);
  const r = await call(`Bearer ${SECRET}`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, deleted: 2 });
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(s.size(), 1, "the live entry survives");
});

test("cron cleanup: a store failure is a 500 with no details", async () => {
  process.env.CRON_SECRET = SECRET;
  __setDefaultStoreForTests({ name: "broken", hit: async () => ({ count: 1, retryAfterSec: 1 }), reset: async () => {}, sweep: async () => { throw new Error("secret-db-detail"); } });
  const r = await call(`Bearer ${SECRET}`);
  assert.equal(r.status, 500);
  assert.ok(!JSON.stringify(await r.json()).includes("secret-db-detail"));
});
