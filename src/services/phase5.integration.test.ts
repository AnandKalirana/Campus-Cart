/**
 * Integration tests for wishlist, messaging and offers against a REAL Postgres.
 * Skipped unless TEST_DATABASE_URL is set.
 *   TEST_DATABASE_URL=postgresql://... AUTH_SECRET=<32+ chars> npm test
 * Not covered here: getMessages / markMessagesRead / updatePurchaseRequestStatus read the session internally (requireUser),
 * so their authorization is covered by the browser-level two-account check, not by these tests.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `p${Date.now().toString(36)}`;

let db: () => import("@/generated/prisma/client").PrismaClient;
let wl: typeof import("./wishlist-service");
let msg: typeof import("./messaging-service");
let pr: typeof import("./purchase-request-service");
type Actor = import("./listing-service").Actor;
let seller: Actor, buyer: Actor, other: Actor;
let uni = "", cat = "", active = "", paused = "", sold = "";

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_SECRET ??= "x".repeat(40);
  db = (await import("@/lib/db")).db;
  wl = await import("./wishlist-service");
  msg = await import("./messaging-service");
  pr = await import("./purchase-request-service");
  uni = (await db().university.create({ data: { name: `U ${tag}`, slug: `u-${tag}`, emailDomains: [] } })).id;
  cat = (await db().category.create({ data: { slug: `c-${tag}`, name: `C ${tag}`, blurb: "b", icon: "Book" } })).id;
  const mk = async (n: string): Promise<Actor> => {
    const u = await db().user.create({ data: { email: `${tag}-${n}@campus.test`, name: `User ${n}`, universityId: uni, emailVerified: new Date() } });
    return { id: u.id, name: u.name, role: "STUDENT", emailVerified: true, universityId: uni };
  };
  seller = await mk("s"); buyer = await mk("b"); other = await mk("o");
  const prod = (status: "ACTIVE" | "PAUSED" | "SOLD", title: string) => db().product.create({ data: { title, description: "d", price: 100, condition: "GOOD", pickupLocation: "Gate", status, sellerId: seller.id, universityId: uni, categoryId: cat } }).then(p => p.id);
  active = await prod("ACTIVE", `A ${tag}`); paused = await prod("PAUSED", `P ${tag}`); sold = await prod("SOLD", `S ${tag}`);
});

after(async () => {
  if (!URL) return;
  await db().user.deleteMany({ where: { email: { startsWith: tag } } }); // cascades products, threads, offers, wishlist
  await db().university.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().category.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

test("wishlist: set is idempotent, only ACTIVE listings can be saved, removing always works", run, async () => {
  assert.deepEqual(await wl.setSaved(buyer.id, active, true), { ok: true, saved: true });
  assert.deepEqual(await wl.setSaved(buyer.id, active, true), { ok: true, saved: true }); // double click
  assert.equal(await db().wishlist.count({ where: { userId: buyer.id, productId: active } }), 1);
  assert.deepEqual(await wl.setSaved(buyer.id, paused, true), { ok: false, code: "not_found" });
  assert.deepEqual(await wl.setSaved(buyer.id, "doesnotexist00000000000", true), { ok: false, code: "not_found" });
  assert.deepEqual([...await wl.savedIdsFor(buyer.id, [active, paused, sold])], [active]);
  assert.equal((await wl.savedIdsFor(other.id, [active])).size, 0); // another user's saves are invisible
  assert.equal((await wl.savedIdsFor(null, [active])).size, 0);
  assert.deepEqual(await wl.setSaved(buyer.id, active, false), { ok: true, saved: false });
  assert.deepEqual(await wl.setSaved(buyer.id, active, false), { ok: true, saved: false });
});

test("messages: buyer starts one thread per listing; seller, paused, sold and bad input are refused", run, async () => {
  const first = await msg.sendMessage(buyer, active, "  Is this available?  ");
  assert.ok(first.ok);
  assert.equal(first.message.body, "Is this available?");
  const second = await msg.sendMessage(buyer, active, "Tomorrow at 5?");
  assert.ok(second.ok);
  assert.equal(second.conversationId, first.conversationId); // same thread, not a new one
  assert.equal(await db().conversation.count({ where: { productId: active, buyerId: buyer.id } }), 1);
  const row = await db().conversation.findUniqueOrThrow({ where: { id: first.conversationId } });
  assert.equal(row.sellerId, seller.id); // seller comes from the listing, never from the caller
  assert.equal(await msg.findBuyerConversationId(buyer.id, active), first.conversationId);
  assert.equal(await msg.findBuyerConversationId(other.id, active), null);

  const own = await msg.sendMessage(seller, active, "hi me");
  assert.deepEqual([own.ok, !own.ok && own.code], [false, "forbidden"]);
  const hidden = await msg.sendMessage(buyer, paused, "hello?");
  assert.deepEqual([hidden.ok, !hidden.ok && hidden.code], [false, "not_found"]); // paused listing is invisible to others
  const gone = await msg.sendMessage(buyer, sold, "hello?");
  assert.equal(gone.ok, false);
  for (const body of ["", "   ", "x".repeat(2001)]) assert.equal((await msg.sendMessage(buyer, active, body)).ok, false);
  const missing = await msg.sendMessage(buyer, "doesnotexist00000000000", "hi");
  assert.deepEqual([missing.ok, !missing.ok && missing.code], [false, "not_found"]);
  // Stored text is kept as plain text, never interpreted.
  const xss = await msg.sendMessage(other, active, "<script>alert(1)</script>");
  assert.ok(xss.ok);
  assert.equal(xss.message.body, "<script>alert(1)</script>");
});

test("replies: seller and buyer can reply in their thread; strangers and closed threads cannot", run, async () => {
  const start = await msg.sendMessage(other, active, "question about the item");
  assert.ok(start.ok);
  const cid = start.conversationId;
  const fromSeller = await msg.replyInConversation(seller, cid, "  yes, still here  ");
  assert.ok(fromSeller.ok);
  assert.equal(fromSeller.message.body, "yes, still here");
  assert.equal(fromSeller.message.senderId, seller.id);
  assert.ok((await msg.replyInConversation(other, cid, "great")).ok);
  const stranger = await msg.replyInConversation(buyer, cid, "let me in"); // buyer has their own thread, not this one
  assert.deepEqual([stranger.ok, !stranger.ok && stranger.code], [false, "not_found"]);
  const unknown = await msg.replyInConversation(seller, "doesnotexist00000000000", "hi");
  assert.deepEqual([unknown.ok, !unknown.ok && unknown.code], [false, "not_found"]);
  for (const body of ["", "  ", "x".repeat(2001)]) assert.equal((await msg.replyInConversation(seller, cid, body)).ok, false);
  await db().product.update({ where: { id: active }, data: { status: "REMOVED" } });
  const closed = await msg.replyInConversation(seller, cid, "too late");
  assert.deepEqual([closed.ok, !closed.ok && closed.code], [false, "forbidden"]);
  await db().product.update({ where: { id: active }, data: { status: "ACTIVE" } });
});

test("offers: owner can't offer, one open offer per buyer, nothing once another offer is accepted, sold is closed", run, async () => {
  const own = await pr.createPurchaseRequest(seller, active, "mine");
  assert.deepEqual([own.ok, !own.ok && own.code], [false, "forbidden"]);
  const ok = await pr.createPurchaseRequest(buyer, active, "  hi  ");
  assert.ok(ok.ok);
  assert.equal(ok.request.note, "hi");
  const dup = await pr.createPurchaseRequest(buyer, active);
  assert.deepEqual([dup.ok, !dup.ok && dup.code], [false, "conflict"]);
  const hidden = await pr.createPurchaseRequest(other, paused);
  assert.deepEqual([hidden.ok, !hidden.ok && hidden.code], [false, "not_found"]);
  const closed = await pr.createPurchaseRequest(other, sold);
  assert.equal(closed.ok, false);
  await db().purchaseRequest.update({ where: { id: ok.request.id }, data: { status: "ACCEPTED" } });
  const late = await pr.createPurchaseRequest(other, active);
  assert.deepEqual([late.ok, !late.ok && late.code], [false, "conflict"]);
  const long = await pr.createPurchaseRequest(other, active, "x".repeat(900));
  assert.equal(long.ok, false); // refused (conflict here), and never stored longer than 500
  assert.ok((await db().purchaseRequest.findMany({ where: { productId: active } })).every(r => (r.note?.length ?? 0) <= 500));
});
