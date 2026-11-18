import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeMail, buildRequest, createMailer, MailError, parseFrom, type MailConfig } from "./mailer";

const base: MailConfig = { MAIL_DRIVER: "resend", MAIL_FROM: "Campus Cart <no-reply@example.com>", RESEND_API_KEY: "re_secret_key", NODE_ENV: "test" };
const mail = { to: "a@uw.edu", subject: "Hi", text: "body" };
const noDelay = async () => {};

test("parseFrom: name+address, bare address, garbage", () => {
  assert.deepEqual(parseFrom("Campus Cart <no-reply@example.com>"), { name: "Campus Cart", email: "no-reply@example.com" });
  assert.deepEqual(parseFrom("no-reply@example.com"), { name: undefined, email: "no-reply@example.com" });
  assert.throws(() => parseFrom("nope"), MailError);
  assert.throws(() => parseFrom(undefined), MailError);
  assert.throws(() => parseFrom("x <a@b.co>\r\nBcc: evil@x.co"), MailError);
});

test("assertSafeMail rejects header injection, bad recipients and oversized bodies", () => {
  assert.throws(() => assertSafeMail({ ...mail, subject: "Hi\r\nBcc: evil@x.co" }), MailError);
  assert.throws(() => assertSafeMail({ ...mail, to: "a@uw.edu,evil@x.co" }), MailError);
  assert.throws(() => assertSafeMail({ ...mail, to: "a@uw.edu\nBcc: x@y.co" }), MailError);
  assert.throws(() => assertSafeMail({ ...mail, to: "not-an-email" }), MailError);
  assert.throws(() => assertSafeMail({ ...mail, text: "x".repeat(20_001) }), MailError);
  assert.throws(() => assertSafeMail({ ...mail, subject: "" }), MailError);
  assertSafeMail(mail);
});

test("buildRequest: resend and brevo shapes; missing keys fail", () => {
  const r = buildRequest(base, mail);
  assert.equal(r.url, "https://api.resend.com/emails");
  assert.equal(r.headers.authorization, "Bearer re_secret_key");
  assert.deepEqual(JSON.parse(r.body).to, ["a@uw.edu"]);
  assert.equal(JSON.parse(r.body).from, "Campus Cart <no-reply@example.com>");
  const b = buildRequest({ ...base, MAIL_DRIVER: "brevo", BREVO_API_KEY: "bk" }, mail);
  assert.equal(b.url, "https://api.brevo.com/v3/smtp/email");
  assert.deepEqual(JSON.parse(b.body).sender, { name: "Campus Cart", email: "no-reply@example.com" });
  assert.throws(() => buildRequest({ ...base, RESEND_API_KEY: undefined }, mail), MailError);
  assert.throws(() => buildRequest({ ...base, MAIL_FROM: undefined }, mail), MailError);
});

test("log driver: prints in dev/test, refuses in production", async () => {
  const lines: string[] = []; const orig = console.info; console.info = (m: string) => { lines.push(String(m)); };
  try { await createMailer({ MAIL_DRIVER: "log", NODE_ENV: "test" })(mail); } finally { console.info = orig; }
  assert.match(lines[0], /\[mail:dev\] to=a@uw.edu/);
  await assert.rejects(createMailer({ MAIL_DRIVER: "log", NODE_ENV: "production" })(mail), /not configured/);
});

test("2xx succeeds with one call", async () => {
  let calls = 0;
  await createMailer(base, async () => { calls++; return { status: 200 }; }, noDelay)(mail);
  assert.equal(calls, 1);
});

test("5xx and 429 retry exactly once, then fail with status only", async () => {
  let calls = 0;
  await assert.rejects(createMailer(base, async () => { calls++; return { status: 503 }; }, noDelay)(mail), (e: Error) => { assert.equal(e.message, "Mail provider responded 503"); return true; });
  assert.equal(calls, 2);
  calls = 0;
  await createMailer(base, async () => ({ status: ++calls === 1 ? 429 : 200 }), noDelay)(mail);
  assert.equal(calls, 2);
});

test("4xx does not retry; error never contains key or address", async () => {
  let calls = 0;
  await assert.rejects(createMailer(base, async () => { calls++; return { status: 401 }; }, noDelay)(mail), (e: Error) => {
    assert.ok(!e.message.includes("re_secret_key") && !e.message.includes("a@uw.edu")); return true;
  });
  assert.equal(calls, 1);
});

test("network failure retries once, error hides provider details", async () => {
  let calls = 0;
  await assert.rejects(createMailer(base, async () => { calls++; throw new Error("connect ECONNREFUSED re_secret_key"); }, noDelay)(mail), (e: Error) => {
    assert.ok(!e.message.includes("re_secret_key")); assert.equal((e as MailError).cause, undefined); return true;
  });
  assert.equal(calls, 2);
});

test("request carries a timeout signal", async () => {
  let signal: AbortSignal | undefined;
  await createMailer(base, async (_u, init) => { signal = init.signal; return { status: 200 }; }, noDelay)(mail);
  assert.ok(signal instanceof AbortSignal);
});
