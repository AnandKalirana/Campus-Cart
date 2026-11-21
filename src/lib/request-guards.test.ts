import test from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "./request-guards";
import { createRateLimiter } from "./auth/rate-limit";

const req = (h: Record<string, string>) => new Request("http://localhost/api/x", { method: "POST", headers: h });

test("isSameOrigin: only an Origin that matches the host passes", () => {
  assert.equal(isSameOrigin(req({ origin: "http://localhost", host: "localhost" })), true);
  assert.equal(isSameOrigin(req({ origin: "https://evil.example", host: "localhost" })), false);
  assert.equal(isSameOrigin(req({ host: "localhost" })), false); // no Origin header
  assert.equal(isSameOrigin(req({ origin: "not a url", host: "localhost" })), false);
  assert.equal(isSameOrigin(req({ origin: "https://campus.example", host: "internal:3000", "x-forwarded-host": "campus.example" })), true);
});

test("rate limiter: blocks after the limit, keys are independent, window resets", () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  assert.equal(rl.check("a").ok, true); assert.equal(rl.check("a").ok, true);
  const blocked = rl.check("a");
  assert.equal(blocked.ok, false); assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(rl.check("b").ok, true);
  t = 1001;
  assert.equal(rl.check("a").ok, true);
});

test("account data limiters block after their limit (6th delete attempt, 4th export)", async () => {
  process.env.AUTH_SECRET ??= "x".repeat(40);
  const { createMemoryStore } = await import("./rate-limit/memory-store");
  const { __setDefaultStoreForTests } = await import("./rate-limit/shared-limiter");
  __setDefaultStoreForTests(createMemoryStore());
  try {
    const g = await import("./request-guards");
    const del: boolean[] = []; for (let i = 0; i < 6; i++) del.push((await g.accountDeleteLimiter.check("v")).ok);
    assert.deepEqual(del, [true, true, true, true, true, false]);
    const exp: boolean[] = []; for (let i = 0; i < 4; i++) exp.push((await g.accountExportLimiter.check("v")).ok);
    assert.deepEqual(exp, [true, true, true, false]);
    assert.equal((await g.accountDeleteLimiter.check("someone-else")).ok, true, "per user");
  } finally { __setDefaultStoreForTests(undefined); }
});
