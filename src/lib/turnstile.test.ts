import test from "node:test";
import assert from "node:assert/strict";
import { turnstileConfigured, verifyTurnstile, verifyUrl, TURNSTILE_VERIFY_URL } from "./turnstile";

const SECRET = "0x-test-secret-value";
type Init = { method: string; headers: Record<string, string>; body: string; signal: AbortSignal };
const ok = (json: unknown, httpOk = true) => async () => ({ ok: httpOk, json: async () => json });

async function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) { prev[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else (process.env as Record<string, string>)[k] = env[k]!; }
  try { return await fn(); } finally { for (const k of Object.keys(env)) { if (prev[k] === undefined) delete process.env[k]; else (process.env as Record<string, string>)[k] = prev[k]!; } }
}
async function captureLogs<T>(fn: () => Promise<T>): Promise<{ out: T; lines: string }> {
  const lines: string[] = []; const o = [console.info, console.warn, console.error];
  console.info = console.warn = console.error = (m: unknown) => { lines.push(String(m)); };
  try { return { out: await fn(), lines: lines.join("\n") }; } finally { [console.info, console.warn, console.error] = o; }
}

test("not configured: skipped outside production, FAILS CLOSED in production", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: "test" }, async () => {
    assert.equal(turnstileConfigured(), false);
    assert.deepEqual(await verifyTurnstile(undefined, "1.2.3.4"), { ok: true, skipped: true });
  });
  await withEnv({ TURNSTILE_SECRET_KEY: undefined, NODE_ENV: "production" }, async () => {
    const { out, lines } = await captureLogs(() => verifyTurnstile("anything", "1.2.3.4"));
    assert.deepEqual(out, { ok: false, reason: "not_configured" });
    assert.match(lines, /turnstile_not_configured/);
  });
});

test("missing, whitespace and oversized tokens are rejected without calling Cloudflare", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET }, async () => {
    let calls = 0; const f = async () => { calls++; return { ok: true, json: async () => ({ success: true }) }; };
    for (const t of [undefined, null, "", "has space", "tab\there", "x".repeat(2049)]) assert.deepEqual(await verifyTurnstile(t, "1.2.3.4", f), { ok: false, reason: "missing" });
    assert.equal(calls, 0);
  });
});

test("sends secret, token and client ip as a form-encoded POST with a timeout; success passes", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_VERIFY_URL: undefined }, async () => {
    let url = "", init!: Init;
    const r = await verifyTurnstile("tok123", "203.0.113.9", async (u, i) => { url = u; init = i; return { ok: true, json: async () => ({ success: true }) }; });
    assert.deepEqual(r, { ok: true });
    assert.equal(url, TURNSTILE_VERIFY_URL);
    assert.equal(init.method, "POST");
    assert.equal(init.headers["content-type"], "application/x-www-form-urlencoded");
    const p = new URLSearchParams(init.body);
    assert.deepEqual([p.get("secret"), p.get("response"), p.get("remoteip")], [SECRET, "tok123", "203.0.113.9"]);
    assert.ok(init.signal instanceof AbortSignal);
    const noIp = new URLSearchParams(await (async () => { let b = ""; await verifyTurnstile("t", "unknown", async (_u, i) => { b = i.body; return { ok: true, json: async () => ({ success: true }) }; }); return b; })());
    assert.equal(noIp.has("remoteip"), false, "unknown ip is not sent");
  });
});

test("only `success: true` passes; anything else is rejected", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET }, async () => {
    for (const body of [{ success: false, "error-codes": ["timeout-or-duplicate"] }, {}, { success: "true" }, { success: 1 }, null as never]) {
      assert.deepEqual(await verifyTurnstile("t", "1.1.1.1", ok(body ?? {})), { ok: false, reason: "rejected" }, JSON.stringify(body));
    }
  });
});

test("network error, timeout and HTTP errors fail closed as `unavailable`; logs never contain secret or token", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET }, async () => {
    const { out, lines } = await captureLogs(async () => [
      await verifyTurnstile("tok-secret-abc", "1.1.1.1", async () => { throw new Error(`ECONNREFUSED ${SECRET}`); }),
      await verifyTurnstile("tok-secret-abc", "1.1.1.1", async () => { throw new DOMException("timed out", "TimeoutError"); }),
      await verifyTurnstile("tok-secret-abc", "1.1.1.1", ok({}, false)),
      await verifyTurnstile("tok-secret-abc", "1.1.1.1", async () => ({ ok: true, json: async () => { throw new Error("bad json"); } })),
    ]);
    for (const r of out) assert.deepEqual(r, { ok: false, reason: "unavailable" });
    assert.ok(!lines.includes(SECRET) && !lines.includes("tok-secret-abc"));
  });
});

test("a bad secret is logged loudly (operator error) but the user just sees a rejection", async () => {
  await withEnv({ TURNSTILE_SECRET_KEY: SECRET }, async () => {
    const { out, lines } = await captureLogs(() => verifyTurnstile("t", "1.1.1.1", ok({ success: false, "error-codes": ["invalid-input-secret"] })));
    assert.deepEqual(out, { ok: false, reason: "rejected" });
    assert.match(lines, /turnstile_bad_secret/);
  });
});

test("verifyUrl: default, loopback http override allowed, anything else ignored", async () => {
  assert.equal(verifyUrl(undefined), TURNSTILE_VERIFY_URL);
  assert.equal(verifyUrl("http://localhost:9999/siteverify"), "http://localhost:9999/siteverify");
  assert.equal(verifyUrl("http://127.0.0.1:1/x"), "http://127.0.0.1:1/x");
  await captureLogs(async () => {
    for (const bad of ["https://evil.example/siteverify", "http://evil.example/x", "http://localhost.evil.example/x", "file:///etc/passwd", "not a url"]) assert.equal(verifyUrl(bad), TURNSTILE_VERIFY_URL, bad);
  });
});
