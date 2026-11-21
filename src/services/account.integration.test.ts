/**
 * Integration tests for account export and deletion against a REAL Postgres.
 * Skipped unless TEST_DATABASE_URL is set.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `a${Date.now().toString(36)}`;
const PW = "Correct-Horse-9";

let db: () => import("@/generated/prisma/client").PrismaClient;
let svc: typeof import("./account-service");
let storage: typeof import("@/lib/storage");
let store: ReturnType<typeof import("@/lib/storage").memoryStore>;
let uni = "", cat = "";
let alice = "", bob = "", admin = "", aliceListing = "", bobListing = "";
const deletedIds: string[] = []; // users removed by the tests: their audit rows outlive them, so clean them up explicitly
const mails: string[] = [];
const realInfo = console.info;

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_SECRET ??= "x".repeat(40);
  db = (await import("@/lib/db")).db;
  storage = await import("@/lib/storage");
  svc = await import("./account-service");
  const { hashPassword } = await import("@/lib/auth/password");
  store = storage.memoryStore();
  storage.__setStoreForTests(store);
  uni = (await db().university.create({ data: { name: `U ${tag}`, slug: `u-${tag}`, emailDomains: [] } })).id;
  cat = (await db().category.create({ data: { slug: `c-${tag}`, name: `C ${tag}`, blurb: "b", icon: "Book" } })).id;
  const hash = await hashPassword(PW);
  const mk = async (n: string, extra: Record<string, unknown> = {}) =>
    (await db().user.create({ data: { email: `${tag}-${n}@campus.test`, name: `User ${n}`, universityId: uni, emailVerified: new Date(), passwordHash: hash, ...extra } })).id;
  alice = await mk("alice"); bob = await mk("bob"); admin = await mk("admin", { role: "ADMIN" });
  const prod = (sellerId: string, title: string) => db().product.create({ data: { title, description: "d", price: 100, condition: "GOOD", pickupLocation: "Gate", sellerId, universityId: uni, categoryId: cat } }).then(p => p.id);
  aliceListing = await prod(alice, `Alice item ${tag}`); bobListing = await prod(bob, `Bob item ${tag}`);
  for (const [i, key] of ["k1", "k2"].entries()) {
    await store.put(`${tag}/${key}`, Buffer.from("x"), "image/webp");
    await db().productImage.create({ data: { productId: aliceListing, url: `/x/${key}`, publicId: `${tag}/${key}`, position: i } });
  }
  await db().wishlist.create({ data: { userId: alice, productId: bobListing } });
  const convo = await db().conversation.create({ data: { productId: bobListing, buyerId: alice, sellerId: bob } });
  await db().message.createMany({ data: [{ conversationId: convo.id, senderId: alice, body: "hi from alice" }, { conversationId: convo.id, senderId: bob, body: "reply from bob" }] });
  await db().purchaseRequest.create({ data: { productId: bobListing, buyerId: alice, note: "alice note" } });
  await db().report.create({ data: { productId: bobListing, reporterId: alice, reason: "alice reason" } });
  await db().notification.create({ data: { userId: alice, kind: "message", title: "alice notif" } });
  console.info = (m: unknown) => { mails.push(String(m)); };
});

after(async () => {
  console.info = realInfo;
  if (!URL) return;
  storage.__setStoreForTests(undefined);
  await db().user.deleteMany({ where: { email: { startsWith: tag } } });
  await db().auditLog.deleteMany({ where: { targetId: { in: [alice, bob, admin, ...deletedIds] } } });
  await db().university.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().category.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

test("export: contains the user's own data and nothing secret or foreign", run, async () => {
  const out = await svc.exportAccountData(alice);
  assert.ok(out);
  const json = JSON.stringify(out);
  assert.equal(out.profile.email, `${tag}-alice@campus.test`);
  assert.equal(out.listings.length, 1);
  assert.equal(out.listings[0].photoCount, 2);
  assert.equal(out.wishlist.length, 1);
  assert.equal(out.conversations.length, 1);
  assert.deepEqual(out.conversations[0].messages.map(m => [m.fromYou, m.body]), [[true, "hi from alice"], [false, "reply from bob"]]);
  assert.equal(out.purchaseRequests.length, 1);
  assert.equal(out.reportsFiled.length, 1);
  assert.equal(out.notifications.length, 1);
  assert.ok(!/passwordHash|sessionVersion|tokenHash|scrypt/i.test(json), "no secrets");
  assert.ok(!json.includes(`${tag}-bob@campus.test`) && !json.includes("User bob"), "other student's identity is not exported");
  assert.equal(out.truncated, false);
});

test("export: another user's export never contains my data (BOLA)", run, async () => {
  const out = await svc.exportAccountData(admin);
  assert.ok(out);
  assert.equal(out.listings.length + out.conversations.length + out.wishlist.length, 0);
  assert.ok(!JSON.stringify(out).includes("alice"));
  assert.equal(await svc.exportAccountData("doesnotexist000000000000"), null);
});

test("delete: wrong password, empty password and admin are refused and nothing is deleted", run, async () => {
  assert.deepEqual(await svc.deleteAccount(alice, "nope-nope-nope"), { ok: false, code: "wrong_password", message: "That password is incorrect." });
  const empty = await svc.deleteAccount(alice, "");
  assert.equal(empty.ok, false);
  const adm = await svc.deleteAccount(admin, PW);
  assert.ok(!adm.ok && adm.code === "admin");
  assert.ok(await db().user.findUnique({ where: { id: alice } }));
  assert.ok(await db().user.findUnique({ where: { id: admin } }));
  assert.equal(store.size(), 2, "photos untouched");
});

test("delete: account without a password hash is refused", run, async () => {
  const id = (await db().user.create({ data: { email: `${tag}-nopw@campus.test`, name: "No Pw", universityId: uni } })).id;
  const r = await svc.deleteAccount(id, "anything");
  assert.ok(!r.ok && r.code === "no_password");
});

test("delete: removes everything of the user, keeps everyone else's, purges photos, notifies by email, audits without PII", run, async () => {
  mails.length = 0;
  assert.deepEqual(await svc.deleteAccount(alice, PW), { ok: true });
  assert.equal(await db().user.findUnique({ where: { id: alice } }), null);
  assert.equal(await db().product.count({ where: { sellerId: alice } }), 0);
  assert.equal(await db().productImage.count({ where: { productId: aliceListing } }), 0);
  assert.equal(await db().wishlist.count({ where: { userId: alice } }), 0);
  assert.equal(await db().conversation.count({ where: { buyerId: alice } }), 0);
  assert.equal(await db().message.count({ where: { senderId: alice } }), 0);
  assert.equal(await db().purchaseRequest.count({ where: { buyerId: alice } }), 0);
  assert.equal(await db().report.count({ where: { reporterId: alice } }), 0);
  assert.equal(await db().notification.count({ where: { userId: alice } }), 0);
  assert.equal(store.size(), 0, "photo blobs purged");
  assert.ok(await db().user.findUnique({ where: { id: bob } }), "other users untouched");
  assert.ok(await db().product.findUnique({ where: { id: bobListing } }), "other users' listings untouched");
  const audit = await db().auditLog.findFirst({ where: { action: "account.self_delete", targetId: alice } });
  assert.ok(audit && audit.actorId === null && audit.detail === null);
  assert.ok(mails.some(m => m.includes(`to=${tag}-alice@campus.test`) && m.includes("was deleted")));
});

test("delete: second attempt is a clean not_found; the old credentials stop working", run, async () => {
  const again = await svc.deleteAccount(alice, PW);
  assert.ok(!again.ok && again.code === "not_found");
  const { authenticate } = await import("./auth-service");
  assert.equal(await authenticate(`${tag}-alice@campus.test`, PW), null);
  assert.equal(await svc.exportAccountData(alice), null);
});

test("delete: a failing photo store does not block or undo the deletion", run, async () => {
  const id = (await db().user.create({ data: { email: `${tag}-carol@campus.test`, name: "Carol", universityId: uni, passwordHash: (await (await import("@/lib/auth/password")).hashPassword(PW)) } })).id;
  const p = await db().product.create({ data: { title: `C ${tag}`, description: "d", price: 1, condition: "GOOD", pickupLocation: "g", sellerId: id, universityId: uni, categoryId: cat } });
  await db().productImage.create({ data: { productId: p.id, url: "/x", publicId: `${tag}/boom`, position: 0 } });
  storage.__setStoreForTests({ put: async () => {}, get: async () => null, delete: async () => { throw new Error("storage down"); } });
  deletedIds.push(id);
  try { assert.deepEqual(await svc.deleteAccount(id, PW), { ok: true }); } finally { storage.__setStoreForTests(store); }
  assert.equal(await db().user.findUnique({ where: { id } }), null);
});
