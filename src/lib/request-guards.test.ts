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

test("account data limiters exist with strict limits", async () => {
  const g = await import("./request-guards");
  assert.equal(g.accountExportLimiter.check("u").ok, true);
  for (let i = 0; i < 5; i++) g.accountDeleteLimiter.check("v");
  assert.equal(g.accountDeleteLimiter.check("v").ok, false); // 6th delete attempt in the window is blocked
});
