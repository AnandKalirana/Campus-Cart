/**
 * Integration tests for the auth service against a REAL Postgres.
 * Skipped unless TEST_DATABASE_URL is set. Point it at a disposable database whose schema was
 * applied with `prisma migrate deploy`. These tests create and delete their own rows.
 *
 *   TEST_DATABASE_URL=postgresql://... AUTH_SECRET=<32+ chars> npm test
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `t${Date.now().toString(36)}`;

type Svc = typeof import("./auth-service");
let svc: Svc;
let db: () => import("@/generated/prisma/client").PrismaClient;
let uniId = "";
let emptyUniId = "";
const mails: string[] = [];
const realInfo = console.info;

const tokenFrom = (mail: string) => /token=([A-Za-z0-9_-]+)/.exec(mail)?.[1] ?? "";
const reg = (over: Record<string, unknown> = {}) => ({ name: "Test Student", email: `${tag}-a@campus.test`, password: "a-long-password-1", universityId: uniId, ...over }) as never;

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_SECRET ??= "x".repeat(40);
  svc = await import("./auth-service");
  db = (await import("@/lib/db")).db;
  uniId = (await db().university.create({ data: { name: `Uni ${tag}`, slug: `uni-${tag}`, emailDomains: ["campus.test"] } })).id;
  emptyUniId = (await db().university.create({ data: { name: `Empty ${tag}`, slug: `empty-${tag}`, emailDomains: [] } })).id;
  console.info = (m: unknown) => { mails.push(String(m)); };
});

after(async () => {
  console.info = realInfo;
  if (!URL) return;
  await db().user.deleteMany({ where: { email: { startsWith: tag } } });
  await db().university.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

test("register: wrong domain and unconfigured campus are rejected, nothing created", run, async () => {
  const bad = await svc.registerStudent(reg({ email: `${tag}-x@gmail.com` }));
  assert.deepEqual([bad.ok, !bad.ok && bad.field], [false, "email"]);
  const none = await svc.registerStudent(reg({ universityId: emptyUniId }));
  assert.deepEqual([none.ok, !none.ok && none.field], [false, "universityId"]);
  assert.equal(await db().user.count({ where: { email: { startsWith: `${tag}-x` } } }), 0);
});

test("register: creates unverified STUDENT with hashed password, ignores injected role", run, async () => {
  const r = await svc.registerStudent(reg({ role: "ADMIN", status: "ACTIVE", emailVerified: new Date() }));
  assert.equal(r.ok, true);
  const u = await db().user.findUniqueOrThrow({ where: { email: `${tag}-a@campus.test` } });
  assert.equal(u.role, "STUDENT");
  assert.equal(u.emailVerified, null);
  assert.ok(u.passwordHash?.startsWith("scrypt$") && !u.passwordHash.includes("a-long-password-1"));
  assert.equal(mails.length, 1);
  assert.ok(tokenFrom(mails[0]).length >= 43);
  const stored = await db().authToken.findFirstOrThrow({ where: { userId: u.id } });
  assert.ok(!mails[0].includes(stored.tokenHash), "only the hash is stored, never the raw token");
});

test("register: duplicate email answers ok but creates nothing and sends no mail", run, async () => {
  const before = mails.length;
  const r = await svc.registerStudent(reg({ password: "another-long-pass-2" }));
  assert.equal(r.ok, true);
  assert.equal(await db().user.count({ where: { email: `${tag}-a@campus.test` } }), 1);
  assert.equal(mails.length, before);
});

test("verify email: works once, then the token is dead", run, async () => {
  const token = tokenFrom(mails[0]);
  assert.equal(await svc.verifyEmailToken("not-a-real-token-not-a-real-token"), false);
  assert.equal(await svc.verifyEmailToken(token), true);
  assert.ok((await db().user.findUniqueOrThrow({ where: { email: `${tag}-a@campus.test` } })).emailVerified);
  assert.equal(await svc.verifyEmailToken(token), false, "reuse must fail");
});

test("verify email: expired token is rejected", run, async () => {
  const u = await db().user.findUniqueOrThrow({ where: { email: `${tag}-a@campus.test` } });
  const { generateToken, hashToken } = await import("@/lib/auth/tokens");
  const t = generateToken();
  await db().authToken.create({ data: { userId: u.id, type: "EMAIL_VERIFY", tokenHash: hashToken(t), expiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await svc.verifyEmailToken(t), false);
});

test("verify email: a password-reset token cannot verify email (type confusion)", run, async () => {
  mails.length = 0;
  await svc.requestPasswordReset(`${tag}-a@campus.test`);
  assert.equal(await svc.verifyEmailToken(tokenFrom(mails[0])), false);
});

test("authenticate: right password works; wrong, unknown and suspended do not", run, async () => {
  const email = `${tag}-a@campus.test`;
  const ok = await svc.authenticate(` ${email.toUpperCase()} `, "a-long-password-1");
  assert.equal(ok?.email, email);
  assert.equal(ok?.role, "STUDENT");
  assert.equal(await svc.authenticate(email, "wrong-password-123"), null);
  assert.equal(await svc.authenticate(`${tag}-nobody@campus.test`, "a-long-password-1"), null);
  await db().user.update({ where: { email }, data: { status: "SUSPENDED" } });
  assert.equal(await svc.authenticate(email, "a-long-password-1"), null, "suspended accounts cannot log in");
  await db().user.update({ where: { email }, data: { status: "ACTIVE" } });
});

test("password reset: single use, bumps sessionVersion, old password stops working", run, async () => {
  const email = `${tag}-a@campus.test`;
  const before = await db().user.findUniqueOrThrow({ where: { email } });
  mails.length = 0;
  await svc.requestPasswordReset(email);
  const token = tokenFrom(mails[0]);
  assert.equal(await svc.resetPassword("bogus-token-bogus-token-bogus", "brand-new-password-3"), false);
  assert.equal(await svc.resetPassword(token, "brand-new-password-3"), true);
  assert.equal(await svc.resetPassword(token, "yet-another-password-4"), false, "token is single use");
  const after = await db().user.findUniqueOrThrow({ where: { email } });
  assert.equal(after.sessionVersion, before.sessionVersion + 1);
  assert.equal(await svc.authenticate(email, "a-long-password-1"), null);
  assert.ok(await svc.authenticate(email, "brand-new-password-3"));
});

test("password reset request: unknown email sends nothing and does not throw", run, async () => {
  mails.length = 0;
  await svc.requestPasswordReset(`${tag}-ghost@campus.test`);
  assert.equal(mails.length, 0);
});

test("password reset request: a newer token invalidates the older one", run, async () => {
  const email = `${tag}-a@campus.test`;
  mails.length = 0;
  await svc.requestPasswordReset(email);
  await svc.requestPasswordReset(email);
  assert.equal(await svc.resetPassword(tokenFrom(mails[0]), "first-attempt-password-5"), false);
  assert.equal(await svc.resetPassword(tokenFrom(mails[1]), "second-attempt-password-6"), true);
});
