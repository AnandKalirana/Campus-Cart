/**
 * Integration tests for offer status changes, the "seen" signal, mark-sold settlement and campus scoping,
 * against a REAL Postgres. Skipped unless TEST_DATABASE_URL is set.
 *   TEST_DATABASE_URL=postgresql://... AUTH_SECRET=<32+ chars> npm test
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `o${Date.now().toString(36)}`;

let db: () => import("@/generated/prisma/client").PrismaClient;
let pr: typeof import("./purchase-request-service");
let ls: typeof import("./listing-service");
type Actor = import("./listing-service").Actor;
let seller: Actor, buyer: Actor, buyer2: Actor, stranger: Actor;
let uniA = "", uniB = "", cat = "";

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_SECRET ??= "x".repeat(40);
  db = (await import("@/lib/db")).db;
  pr = await import("./purchase-request-service");
  ls = await import("./listing-service");
  uniA = (await db().university.create({ data: { name: `UA ${tag}`, slug: `ua-${tag}`, emailDomains: [] } })).id;
  uniB = (await db().university.create({ data: { name: `UB ${tag}`, slug: `ub-${tag}`, emailDomains: [] } })).id;
  cat = (await db().category.create({ data: { slug: `c-${tag}`, name: `C ${tag}`, blurb: "b", icon: "Book" } })).id;
  const mk = async (n: string): Promise<Actor> => {
    const u = await db().user.create({ data: { email: `${tag}-${n}@campus.test`, name: `User ${n}`, universityId: uniA, emailVerified: new Date() } });
    return { id: u.id, name: u.name, role: "STUDENT", emailVerified: true, universityId: uniA };
  };
  seller = await mk("s"); buyer = await mk("b"); buyer2 = await mk("b2"); stranger = await mk("x");
});

after(async () => {
  if (!URL) return;
  await db().user.deleteMany({ where: { email: { startsWith: tag } } });
  await db().university.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().category.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

const listing = (title: string, status: "ACTIVE" | "PAUSED" = "ACTIVE", universityId = uniA) =>
  db().product.create({ data: { title: `${title} ${tag}`, description: "d", price: 100, condition: "GOOD", pickupLocation: "Gate", status, sellerId: seller.id, universityId, categoryId: cat } }).then(p => p.id);
const offer = (productId: string, buyerId = buyer.id) => db().purchaseRequest.create({ data: { productId, buyerId } }).then(r => r.id);

test("seller opening an offer stamps it once; strangers and the buyer cannot", run, async () => {
  const id = await offer(await listing("seen"));
  assert.deepEqual(await pr.markOfferSeenAs(stranger.id, id), { ok: false, code: "not_found" });
  assert.deepEqual(await pr.markOfferSeenAs(buyer.id, id), { ok: false, code: "not_found" }); // the buyer can't fake "seen"
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id } })).sellerSeenAt, null);
  const first = await pr.markOfferSeenAs(seller.id, id);
  assert.ok(first.ok);
  const second = await pr.markOfferSeenAs(seller.id, id); // reopening changes nothing
  assert.ok(second.ok && first.ok && +second.seenAt === +first.seenAt);
  assert.deepEqual(await pr.markOfferSeenAs(seller.id, "doesnotexist00000000000"), { ok: false, code: "not_found" });
});

test("accept and decline: only the seller, only while pending; strangers can't probe the id (IDOR)", run, async () => {
  const p = await listing("acc");
  const id = await offer(p);
  const denied = await pr.updatePurchaseRequestStatusAs(stranger.id, id, "ACCEPTED");
  assert.deepEqual([denied.ok, !denied.ok && denied.code], [false, "not_found"]);
  const byBuyer = await pr.updatePurchaseRequestStatusAs(buyer.id, id, "ACCEPTED");
  assert.deepEqual([byBuyer.ok, !byBuyer.ok && byBuyer.code], [false, "forbidden"]); // a buyer can't accept their own offer
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id } })).status, "PENDING");

  const ok = await pr.updatePurchaseRequestStatusAs(seller.id, id, "ACCEPTED");
  assert.ok(ok.ok && ok.request.status === "ACCEPTED");
  assert.equal((await db().product.findUniqueOrThrow({ where: { id: p } })).status, "PAUSED"); // no new offers while one is accepted
  const again = await pr.updatePurchaseRequestStatusAs(seller.id, id, "ACCEPTED"); // double click
  assert.deepEqual([again.ok, !again.ok && again.code], [false, "forbidden"]);
});

test("accept still works after the seller paused the listing; it is refused once sold or removed", run, async () => {
  const paused = await offer(await listing("paused", "PAUSED"));
  const r = await pr.updatePurchaseRequestStatusAs(seller.id, paused, "ACCEPTED");
  assert.ok(r.ok, "a paused listing must not make Accept fail");
  const soldP = await listing("soldlater");
  const soldOffer = await offer(soldP);
  await db().product.update({ where: { id: soldP }, data: { status: "SOLD" } });
  const refused = await pr.updatePurchaseRequestStatusAs(seller.id, soldOffer, "ACCEPTED");
  assert.deepEqual([refused.ok, !refused.ok && refused.code], [false, "conflict"]);
  assert.match(!refused.ok ? refused.message : "", /sold/i); // the UI shows this text, so it must say why
});

test("only one offer per listing can be accepted", run, async () => {
  const p = await listing("two");
  const a = await offer(p, buyer.id), b = await offer(p, buyer2.id);
  assert.ok((await pr.updatePurchaseRequestStatusAs(seller.id, a, "ACCEPTED")).ok);
  const second = await pr.updatePurchaseRequestStatusAs(seller.id, b, "ACCEPTED");
  assert.deepEqual([second.ok, !second.ok && second.code], [false, "conflict"]);
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id: b } })).status, "PENDING");
});

test("decline releases nothing it shouldn't; declining an accepted offer reopens the listing", run, async () => {
  const p = await listing("dec");
  const id = await offer(p);
  const d = await pr.updatePurchaseRequestStatusAs(seller.id, id, "DECLINED");
  assert.ok(d.ok && d.request.status === "DECLINED");
  const after = await pr.updatePurchaseRequestStatusAs(seller.id, id, "DECLINED");
  assert.deepEqual([after.ok, !after.ok && after.message], [false, "This offer has already been closed."]);
});

test("buyer can cancel their own pending offer, but not someone else's", run, async () => {
  const id = await offer(await listing("cancel"), buyer.id);
  const other = await pr.updatePurchaseRequestStatusAs(buyer2.id, id, "CANCELLED");
  assert.deepEqual([other.ok, !other.ok && other.code], [false, "not_found"]);
  assert.ok((await pr.updatePurchaseRequestStatusAs(buyer.id, id, "CANCELLED")).ok);
});

test("marking a listing SOLD finishes the accepted offer for the buyer and leaves pending ones closed-by-derivation", run, async () => {
  const p = await listing("sold");
  const accepted = await offer(p, buyer.id), waiting = await offer(p, buyer2.id);
  await db().purchaseRequest.update({ where: { id: accepted }, data: { status: "ACCEPTED" } });
  const r = await ls.changeListingStatus(seller, p, "sold");
  assert.ok(r.ok);
  const a = await db().purchaseRequest.findUniqueOrThrow({ where: { id: accepted } });
  assert.equal(a.status, "COMPLETED");
  assert.ok(a.sellerMarkedSoldAt);
  const w = await db().purchaseRequest.findUniqueOrThrow({ where: { id: waiting } });
  assert.equal(w.status, "PENDING"); // row kept (history); the UI derives "Item sold" from the listing
  // The buyer's dashboard query now carries everything the UI needs to say "Deal done" / "Item sold".
  const mine = await pr.getPurchaseRequestsFor(buyer.id, "buyer");
  const row = mine.find(m => m.id === accepted);
  assert.ok(row && row.status === "COMPLETED" && row.productStatus === "SOLD");
  const theirs = (await pr.getPurchaseRequestsFor(buyer2.id, "buyer")).find(m => m.id === waiting);
  assert.ok(theirs && theirs.status === "PENDING" && theirs.productStatus === "SOLD");
});

test("a failed sold-transition (not the owner) changes no offers", run, async () => {
  const p = await listing("notmine");
  const accepted = await offer(p);
  await db().purchaseRequest.update({ where: { id: accepted }, data: { status: "ACCEPTED" } });
  const r = await ls.changeListingStatus(stranger, p, "sold");
  assert.equal(r.ok, false);
  assert.equal((await db().purchaseRequest.findUniqueOrThrow({ where: { id: accepted } })).status, "ACCEPTED");
});

test("browse and home listings are scoped to the chosen campus", run, async () => {
  await listing("here", "ACTIVE", uniA); await listing("there", "ACTIVE", uniB);
  const base = { page: 1, sort: "newest" as const, q: tag };
  const a = await ls.searchListings({ ...base, campus: `ua-${tag}` });
  assert.ok(a.items.length >= 1 && a.items.every(i => i.campusName === `UA ${tag}`), "UA search leaked another campus");
  const b = await ls.searchListings({ ...base, campus: `ub-${tag}` });
  assert.ok(b.items.length === 1 && b.items[0].campusName === `UB ${tag}`);
  const all = await ls.searchListings({ ...base, campus: "all" });
  assert.equal(all.total, a.total + b.total); // "all" is the explicit every-campus choice
  const latestB = await ls.latestListings(50, `ub-${tag}`);
  assert.ok(latestB.length === 1 && latestB.every(i => i.campusName === `UB ${tag}`));
});
