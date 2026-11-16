/**
 * Admin + reports against a REAL Postgres. Skipped unless TEST_DATABASE_URL is set.
 * Covers the service layer (authorization re-check, state changes, audit rows, notifications). The page/action layer is covered by the browser run.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `a${Date.now().toString(36)}`;

let db: () => import("@/generated/prisma/client").PrismaClient;
let adm: typeof import("./admin-service");
let rep: typeof import("./report-service");
let admin = "", student = "", seller = "", buyer = "", uni = "", cat = "", p1 = "", p2 = "";

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  db = (await import("@/lib/db")).db;
  adm = await import("./admin-service");
  rep = await import("./report-service");
  uni = (await db().university.create({ data: { name: `U ${tag}`, slug: `u-${tag}`, emailDomains: [`${tag}.test`] } })).id;
  cat = (await db().category.create({ data: { slug: `c-${tag}`, name: `C ${tag}`, blurb: "b", icon: "Book" } })).id;
  const mk = async (n: string, role: "ADMIN" | "STUDENT" = "STUDENT") => (await db().user.create({ data: { email: `${tag}-${n}@${tag}.test`, name: `User ${n}`, role, universityId: uni, emailVerified: new Date() } })).id;
  admin = await mk("admin", "ADMIN"); student = await mk("student"); seller = await mk("seller"); buyer = await mk("buyer");
  const prod = async (title: string) => (await db().product.create({ data: { title, description: "d", price: 100, condition: "GOOD", pickupLocation: "Gate", status: "ACTIVE", sellerId: seller, universityId: uni, categoryId: cat } })).id;
  p1 = await prod(`One ${tag}`); p2 = await prod(`Two ${tag}`);
});

after(async () => {
  if (!URL) return;
  await db().auditLog.deleteMany({ where: { OR: [{ actorId: admin }, { targetId: { in: [p1, p2, uni] } }] } });
  await db().user.deleteMany({ where: { email: { startsWith: tag } } });
  await db().university.deleteMany({ where: { OR: [{ slug: { endsWith: tag } }, { name: { startsWith: `Camp ${tag}` } }] } });
  await db().category.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

test("every admin operation refuses a non-admin, even with valid ids", run, async () => {
  const s = { id: student };
  assert.equal(await adm.overview(s), null);
  assert.equal(await adm.listReports(s, "OPEN", 1), null);
  assert.equal(await adm.listListings(s, undefined, undefined, 1), null);
  assert.equal(await adm.listUsers(s, undefined, undefined, 1), null);
  assert.equal(await adm.listCampuses(s), null);
  assert.equal(await adm.listAudit(s, 1), null);
  const r1 = await adm.moderateListing(s, p1, "remove", "I am not an admin"); assert.deepEqual([r1.ok, !r1.ok && r1.code], [false, "forbidden"]);
  const r2 = await adm.moderateUser(s, seller, "suspend", "I am not an admin"); assert.deepEqual([r2.ok, !r2.ok && r2.code], [false, "forbidden"]);
  const r3 = await adm.saveCampus(s, null, { name: `Camp ${tag} x`, domains: "x.edu", isActive: true }); assert.equal(r3.ok, false);
  assert.equal((await db().product.findUniqueOrThrow({ where: { id: p1 } })).status, "ACTIVE");
  // A suspended admin loses access immediately.
  await db().user.update({ where: { id: admin }, data: { status: "SUSPENDED" } });
  assert.equal(await adm.overview({ id: admin }), null);
  await db().user.update({ where: { id: admin }, data: { status: "ACTIVE" } });
  assert.notEqual(await adm.overview({ id: admin }), null);
});

test("reports: students can report others' visible listings once; not their own; admin dismiss / remove flows", run, async () => {
  assert.deepEqual(await rep.createReport(buyer, p1, "Looks like a scam to me"), { ok: true });
  const dup = await rep.createReport(buyer, p1, "Still looks like a scam"); assert.deepEqual([dup.ok, !dup.ok && dup.code], [false, "conflict"]);
  const own = await rep.createReport(seller, p1, "reporting myself"); assert.deepEqual([own.ok, !own.ok && own.code], [false, "forbidden"]);
  const gone = await rep.createReport(buyer, "doesnotexist00000000000", "does not exist here"); assert.deepEqual([gone.ok, !gone.ok && gone.code], [false, "not_found"]);
  assert.deepEqual(await rep.createReport(student, p1, "Second reporter, same item"), { ok: true });
  assert.deepEqual(await rep.createReport(student, p2, "Different item, not great"), { ok: true });

  const open = await adm.listReports({ id: admin }, "OPEN", 1);
  assert.ok(open && open.rows.filter(r => [p1, p2].includes(r.product.id)).length === 3);
  const r2 = open!.rows.find(r => r.product.id === p2)!;
  assert.deepEqual(await adm.resolveReport({ id: admin }, r2.id, "dismiss", "Fine on inspection"), { ok: true });
  const again = await adm.resolveReport({ id: admin }, r2.id, "dismiss"); assert.deepEqual([again.ok, !again.ok && again.code], [false, "conflict"]);
  assert.equal((await db().product.findUniqueOrThrow({ where: { id: p2 } })).status, "ACTIVE"); // dismiss never touches the listing

  const r1 = open!.rows.find(r => r.product.id === p1)!;
  const noReason = await adm.resolveReport({ id: admin }, r1.id, "remove_listing"); assert.deepEqual([noReason.ok, !noReason.ok && noReason.code], [false, "invalid"]);
  // An open offer on the listing is cancelled when it's removed.
  const offer = await db().purchaseRequest.create({ data: { productId: p1, buyerId: buyer, status: "PENDING" } });
  assert.deepEqual(await adm.resolveReport({ id: admin }, r1.id, "remove_listing", "Prohibited item"), { ok: true });
  assert.equal((await db().product.findUniqueOrThrow({ where: { id: p1 } })).status, "REMOVED");
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id: offer.id } })).status, "CANCELLED");
  assert.equal(await db().report.count({ where: { productId: p1, status: "OPEN" } }), 0); // both reports on it are closed
  assert.equal(await db().report.count({ where: { productId: p1, status: "ACTIONED" } }), 2);
  assert.ok(await db().notification.findFirst({ where: { userId: seller, kind: "moderation", title: { contains: `One ${tag}` } } }));
  const gone2 = await rep.createReport(buyer, p1, "Removed listing report"); assert.equal(gone2.ok, false); // removed listings are no longer reportable
  assert.ok(await db().auditLog.findFirst({ where: { actorId: admin, action: "listing.remove", targetId: p1, detail: "Prohibited item" } }));
});

test("listing moderation: remove twice conflicts; restore returns it PAUSED; audit rows written", run, async () => {
  const dup = await adm.moderateListing({ id: admin }, p1, "remove", "again again"); assert.deepEqual([dup.ok, !dup.ok && dup.code], [false, "conflict"]);
  assert.deepEqual(await adm.moderateListing({ id: admin }, p1, "restore", "Appeal accepted"), { ok: true });
  assert.equal((await db().product.findUniqueOrThrow({ where: { id: p1 } })).status, "PAUSED");
  const bad = await adm.moderateListing({ id: admin }, p2, "restore", "not removed"); assert.deepEqual([bad.ok, !bad.ok && bad.code], [false, "conflict"]);
  const missing = await adm.moderateListing({ id: admin }, "doesnotexist00000000000", "remove", "no such thing"); assert.deepEqual([missing.ok, !missing.ok && missing.code], [false, "not_found"]);
  assert.ok(await db().auditLog.findFirst({ where: { action: "listing.restore", targetId: p1 } }));
});

test("user moderation: no self/admin targets; suspend signs out and hides listings; reinstate restores", run, async () => {
  const self = await adm.moderateUser({ id: admin }, admin, "suspend", "oops oops"); assert.deepEqual([self.ok, !self.ok && self.code], [false, "invalid"]);
  const other = await db().user.create({ data: { email: `${tag}-admin2@${tag}.test`, name: "Admin Two", role: "ADMIN", universityId: uni } });
  const onAdmin = await adm.moderateUser({ id: admin }, other.id, "suspend", "peer admin"); assert.deepEqual([onAdmin.ok, !onAdmin.ok && onAdmin.code], [false, "forbidden"]);
  const before = (await db().user.findUniqueOrThrow({ where: { id: seller } })).sessionVersion;
  const offer = await db().purchaseRequest.create({ data: { productId: p2, buyerId: buyer, status: "PENDING" } });
  assert.deepEqual(await adm.moderateUser({ id: admin }, seller, "suspend", "Repeated scams"), { ok: true });
  const s = await db().user.findUniqueOrThrow({ where: { id: seller } });
  assert.equal(s.status, "SUSPENDED"); assert.equal(s.sessionVersion, before + 1);
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id: offer.id } })).status, "CANCELLED");
  const twice = await adm.moderateUser({ id: admin }, seller, "suspend", "twice twice"); assert.deepEqual([twice.ok, !twice.ok && twice.code], [false, "conflict"]);
  const { searchListings } = await import("./listing-service");
  const { parseSearchParams } = await import("@/lib/validation/listing");
  const res = await searchListings(parseSearchParams({ q: `Two ${tag}` }));
  assert.equal(res.items.some(i => i.id === p2), false); // a suspended seller's listings leave browse
  assert.deepEqual(await adm.moderateUser({ id: admin }, seller, "reinstate", "Appeal accepted"), { ok: true });
  assert.equal((await searchListings(parseSearchParams({ q: `Two ${tag}` }))).items.some(i => i.id === p2), true);
  assert.equal((await db().user.findUniqueOrThrow({ where: { id: seller } })).status, "ACTIVE");
  const notSusp = await adm.moderateUser({ id: admin }, seller, "reinstate", "already fine"); assert.deepEqual([notSusp.ok, !notSusp.ok && notSusp.code], [false, "conflict"]);
});

test("campuses: validate domains, block overlaps, require a domain when active, audit changes", run, async () => {
  const a = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} A`, city: "Pune", domains: `a-${tag}.edu`, isActive: true });
  assert.ok(a.ok);
  const bad = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} B`, domains: "gmail.com", isActive: true }); assert.deepEqual([bad.ok, !bad.ok && bad.code], [false, "invalid"]);
  const sub = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} C`, domains: `cs.a-${tag}.edu`, isActive: true }); assert.deepEqual([sub.ok, !sub.ok && sub.code], [false, "conflict"]); // subdomain of A
  const same = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} D`, domains: `A-${tag}.EDU`, isActive: true }); assert.deepEqual([same.ok, !same.ok && same.code], [false, "conflict"]);
  const none = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} E`, domains: "", isActive: true }); assert.deepEqual([none.ok, !none.ok && none.code], [false, "invalid"]);
  const dupName = await adm.saveCampus({ id: admin }, null, { name: `Camp ${tag} A`, domains: `other-${tag}.edu`, isActive: true }); assert.deepEqual([dupName.ok, !dupName.ok && dupName.code], [false, "conflict"]);
  assert.ok(a.ok);
  const upd = await adm.saveCampus({ id: admin }, a.id, { name: `Camp ${tag} A`, domains: `a-${tag}.edu, a2-${tag}.edu`, isActive: false }); assert.ok(upd.ok); // may keep its own domain
  const row = await db().university.findUniqueOrThrow({ where: { id: a.id } });
  assert.deepEqual(row.emailDomains, [`a-${tag}.edu`, `a2-${tag}.edu`]); assert.equal(row.isActive, false);
  const miss = await adm.saveCampus({ id: admin }, "doesnotexist00000000000", { name: `Camp ${tag} Z`, domains: `z-${tag}.edu`, isActive: true }); assert.deepEqual([miss.ok, !miss.ok && miss.code], [false, "not_found"]);
  assert.equal(await db().auditLog.count({ where: { targetId: a.id, action: { in: ["campus.create", "campus.update"] } } }), 2);
  await db().auditLog.deleteMany({ where: { targetId: a.id } });
});
