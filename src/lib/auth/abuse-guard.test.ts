import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
process.env.AUTH_SECRET ??= "x".repeat(40);

import { createMemoryStore } from "@/lib/rate-limit/memory-store";
import { __setDefaultStoreForTests } from "@/lib/rate-limit/shared-limiter";
import { clientIpFrom, guardForgot, guardLogin, guardSignup, loginSucceeded } from "./abuse-guard";
import type { CaptchaResult } from "@/lib/turnstile";

const pass = async (): Promise<CaptchaResult> => ({ ok: true });
const fail = async (): Promise<CaptchaResult> => ({ ok: false, reason: "rejected" });
const quiet = async <T>(fn: () => Promise<T>) => { const o = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = o; } };
beforeEach(() => __setDefaultStoreForTests(createMemoryStore()));

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

test("clientIpFrom: trusted header order, validation, no garbage keys", () => {
  assert.equal(clientIpFrom(h({ "x-vercel-forwarded-for": "198.51.100.7", "x-forwarded-for": "9.9.9.9" })), "198.51.100.7");
  assert.equal(clientIpFrom(h({ "x-real-ip": "198.51.100.8", "x-forwarded-for": "9.9.9.9" })), "198.51.100.8");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })), "203.0.113.5");
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
  for (const bad of ["", "not-an-ip", "1.2.3.4.5", "999.1.1.1", "<script>", "a".repeat(500)]) assert.equal(clientIpFrom(h({ "x-forwarded-for": bad })), "unknown", bad);
  assert.equal(clientIpFrom(h({})), "unknown");
});

test("login: 30 attempts per IP per window, then blocked with retry-after", async () => {
  await quiet(async () => {
    for (let i = 0; i < 30; i++) assert.equal((await guardLogin({ ip: "1.1.1.1", email: `u${i}@uw.edu`, token: "t", verify: pass })).ok, true, `attempt ${i + 1}`);
    const r = await guardLogin({ ip: "1.1.1.1", email: "u31@uw.edu", token: "t", verify: pass });
    assert.ok(!r.ok && r.reason === "rate_limited" && r.retryAfterSec >= 1);
    assert.equal((await guardLogin({ ip: "1.1.1.2", email: "u31@uw.edu", token: "t", verify: pass })).ok, true, "another IP is unaffected");
  });
});

test("login: a DISTRIBUTED guesser shares ONE budget per account (10 tries across many IPs, not 10 per IP)", async () => {
  await quiet(async () => {
    const outcomes: boolean[] = [];
    for (let i = 0; i < 14; i++) outcomes.push((await guardLogin({ ip: `198.51.100.${i + 1}`, email: "Victim@UW.edu", token: "t", verify: pass })).ok);
    assert.deepEqual(outcomes, [...Array(10).fill(true), ...Array(4).fill(false)]);
    const r = await guardLogin({ ip: "203.0.113.50", email: " victim@uw.edu ", token: "t", verify: pass });
    assert.ok(!r.ok && r.reason === "rate_limited", "email is normalised, so case/space tricks don't dodge the limit");
    assert.equal((await guardLogin({ ip: "203.0.113.51", email: "someone-else@uw.edu", token: "t", verify: pass })).ok, true, "other accounts unaffected");
  });
});

test("login: a successful login clears that account's counter", async () => {
  await quiet(async () => {
    for (let i = 0; i < 9; i++) await guardLogin({ ip: `192.0.2.${i + 1}`, email: "ok@uw.edu", token: "t", verify: pass });
    await loginSucceeded("OK@uw.edu");
    for (let i = 0; i < 10; i++) assert.equal((await guardLogin({ ip: `192.0.2.${i + 20}`, email: "ok@uw.edu", token: "t", verify: pass })).ok, true);
    assert.equal((await guardLogin({ ip: "192.0.2.99", email: "ok@uw.edu", token: "t", verify: pass })).ok, false);
  });
});

test("login: failed captcha blocks, burns the IP budget, but never counts against the victim's account", async () => {
  await quiet(async () => {
    for (let i = 0; i < 20; i++) { const r = await guardLogin({ ip: "10.9.9.9", email: "victim@uw.edu", token: "bad", verify: fail }); assert.ok(!r.ok && r.reason === "captcha"); }
    // the account budget is untouched: a real user can still try 10 times
    for (let i = 0; i < 10; i++) assert.equal((await guardLogin({ ip: `172.16.0.${i + 1}`, email: "victim@uw.edu", token: "t", verify: pass })).ok, true);
  });
});

test("login: IP limit is checked before the captcha (an exhausted IP never reaches Cloudflare)", async () => {
  await quiet(async () => {
    for (let i = 0; i < 30; i++) await guardLogin({ ip: "7.7.7.7", email: "a@uw.edu", token: "t", verify: pass });
    let verifyCalls = 0;
    const r = await guardLogin({ ip: "7.7.7.7", email: "a@uw.edu", token: "t", verify: async () => { verifyCalls++; return { ok: true }; } });
    assert.ok(!r.ok && r.reason === "rate_limited");
    assert.equal(verifyCalls, 0);
  });
});

test("signup: 5 per IP per hour; 3 per email per hour across IPs (mail-bombing cap)", async () => {
  await quiet(async () => {
    const ipRuns: boolean[] = [];
    for (let i = 0; i < 7; i++) ipRuns.push((await guardSignup({ ip: "5.5.5.5", email: `new${i}@uw.edu`, token: "t", verify: pass })).ok);
    assert.deepEqual(ipRuns, [true, true, true, true, true, false, false]);
    const emailRuns: boolean[] = [];
    for (let i = 0; i < 5; i++) emailRuns.push((await guardSignup({ ip: `6.6.6.${i + 1}`, email: "target@uw.edu", token: "t", verify: pass })).ok);
    assert.deepEqual(emailRuns, [true, true, true, false, false]);
  });
});

test("signup: failed captcha does not consume the email's budget", async () => {
  await quiet(async () => {
    for (let i = 0; i < 4; i++) { const r = await guardSignup({ ip: `8.8.8.${i + 1}`, email: "target@uw.edu", token: "bad", verify: fail }); assert.ok(!r.ok && r.reason === "captcha"); }
    for (let i = 0; i < 3; i++) assert.equal((await guardSignup({ ip: `9.9.9.${i + 1}`, email: "target@uw.edu", token: "t", verify: pass })).ok, true);
  });
});

test("forgot-password: per-IP and per-address caps", async () => {
  const perEmail: boolean[] = [];
  for (let i = 0; i < 5; i++) perEmail.push((await guardForgot({ ip: `4.4.4.${i + 1}`, email: "victim@uw.edu" })).ok);
  assert.deepEqual(perEmail, [true, true, true, false, false]);
  const perIp: boolean[] = [];
  for (let i = 0; i < 7; i++) perIp.push((await guardForgot({ ip: "3.3.3.3", email: `x${i}@uw.edu` })).ok);
  assert.deepEqual(perIp, [true, true, true, true, true, false, false]);
});
