/**
 * Integration tests for listings against a REAL Postgres (schema from the committed migration).
 * Skipped unless TEST_DATABASE_URL is set.
 *   TEST_DATABASE_URL=postgresql://... AUTH_SECRET=<32+ chars> npm test
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const URL = process.env.TEST_DATABASE_URL;
const run = { skip: URL ? false : "TEST_DATABASE_URL not set" } as const;
const tag = `l${Date.now().toString(36)}`;

type Svc = typeof import("./listing-service");
let svc: Svc;
let db: () => import("@/generated/prisma/client").PrismaClient;
let store: ReturnType<typeof import("@/lib/storage").memoryStore>;
let A: import("./listing-service").Actor, B: import("./listing-service").Actor, UNVERIFIED: import("./listing-service").Actor, NOCAMPUS: import("./listing-service").Actor;
let uniA = "", uniB = "", catBooks = "";
const input = (over: Record<string, unknown> = {}) => ({ title: `Thing ${tag}`, description: "A perfectly fine thing.", categorySlug: `books-${tag}`, condition: "GOOD", price: 500, originalPrice: undefined, pickupLocation: "Library", ...over }) as never;
const png = () => sharp({ create: { width: 300, height: 300, channels: 3, background: "#60a5fa" } }).png().toBuffer();

before(async () => {
  if (!URL) return;
  process.env.DATABASE_URL = URL;
  process.env.AUTH_SECRET ??= "x".repeat(40);
  svc = await import("./listing-service");
  db = (await import("@/lib/db")).db;
  const st = await import("@/lib/storage");
  store = st.memoryStore(); st.__setStoreForTests(store);
  uniA = (await db().university.create({ data: { name: `UniA ${tag}`, slug: `unia-${tag}`, emailDomains: [] } })).id;
  uniB = (await db().university.create({ data: { name: `UniB ${tag}`, slug: `unib-${tag}`, emailDomains: [] } })).id;
  catBooks = (await db().category.create({ data: { slug: `books-${tag}`, name: `Books ${tag}`, blurb: "b", icon: "BookOpen" } })).id;
  await db().category.create({ data: { slug: `lap-${tag}`, name: `Laptops ${tag}`, blurb: "b", icon: "Laptop" } });
  const mk = async (n: string, uni: string | null, verified: boolean) => {
    const u = await db().user.create({ data: { email: `${tag}-${n}@campus.test`, name: `User ${n}`, universityId: uni, emailVerified: verified ? new Date() : null } });
    return { id: u.id, name: `User ${n}`, role: "STUDENT" as const, emailVerified: verified, universityId: uni };
  };
  A = await mk("a", uniA, true); B = await mk("b", uniB, true); UNVERIFIED = await mk("u", uniA, false); NOCAMPUS = await mk("n", null, true);
});

after(async () => {
  if (!URL) return;
  await db().user.deleteMany({ where: { email: { startsWith: tag } } });
  await db().university.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().category.deleteMany({ where: { slug: { endsWith: tag } } });
  await db().$disconnect();
});

test("create: needs verified email and a campus; campus comes from the account; starts paused", run, async () => {
  assert.equal((await svc.createListing(UNVERIFIED, input())).ok, false);
  assert.equal((await svc.createListing(NOCAMPUS, input())).ok, false);
  const bad = await svc.createListing(A, input({ categorySlug: "nope" }));
  assert.deepEqual([bad.ok, !bad.ok && bad.field], [false, "categorySlug"]);
  const r = await svc.createListing(A, input());
  assert.ok(r.ok);
  const row = await db().product.findUniqueOrThrow({ where: { id: r.value.id } });
  assert.equal(row.universityId, uniA);
  assert.equal(row.sellerId, A.id);
  assert.equal(row.status, "PAUSED");
});

test("IDOR/BOLA: another student cannot read-edit, change status, or touch photos of my listing", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Mine ${tag}` }))) as { value: { id: string } };
  const up = await svc.addListingImage(A, id, await png());
  assert.ok(up.ok);
  assert.equal(await svc.getOwnedListing(id, B.id), null);
  assert.ok(await svc.getOwnedListing(id, A.id));
  const upd = await svc.updateListing(B, id, input({ title: "Hacked" }) as never);
  assert.deepEqual([upd.ok, !upd.ok && upd.code], [false, "not_found"]);
  for (const a of ["publish", "pause", "sold", "remove"] as const) assert.equal((await svc.changeListingStatus(B, id, a)).ok, false, a);
  assert.equal((await svc.addListingImage(B, id, await png())).ok, false);
  assert.equal((await svc.deleteListingImage(B, id, up.ok ? up.value.id : "")).ok, false);
  const row = await db().product.findUniqueOrThrow({ where: { id }, include: { images: true } });
  assert.equal(row.title, `Mine ${tag}`);
  assert.equal(row.status, "PAUSED");
  assert.equal(row.images.length, 1);
});

test("visibility: paused is hidden from anonymous and other students, visible to the owner; removed is gone", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Hidden ${tag}` }))) as { value: { id: string } };
  assert.equal(await svc.getListingForViewer(id, null), null);
  assert.equal(await svc.getListingForViewer(id, B), null);
  assert.ok(await svc.getListingForViewer(id, A));
  assert.ok(await svc.getListingForViewer(id, { id: "x", role: "ADMIN" }));
  await svc.addListingImage(A, id, await png());
  assert.ok((await svc.changeListingStatus(A, id, "publish")).ok);
  assert.ok(await svc.getListingForViewer(id, null));
  assert.ok((await svc.changeListingStatus(A, id, "remove")).ok);
  assert.equal(await svc.getListingForViewer(id, A), null);
  assert.equal(await svc.getListingForViewer(id, null), null);
});

test("publish requires a photo; status machine rejects invalid transitions", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Flow ${tag}` }))) as { value: { id: string } };
  const noPhoto = await svc.changeListingStatus(A, id, "publish");
  assert.deepEqual([noPhoto.ok, !noPhoto.ok && noPhoto.code], [false, "invalid"]);
  await svc.addListingImage(A, id, await png());
  assert.ok((await svc.changeListingStatus(A, id, "publish")).ok);
  const again = await svc.changeListingStatus(A, id, "publish");
  assert.deepEqual([again.ok, !again.ok && again.code], [false, "conflict"]);
  assert.ok((await svc.changeListingStatus(A, id, "sold")).ok);
  assert.equal((await svc.changeListingStatus(A, id, "pause")).ok, false);
  const sold = await svc.getListingForViewer(id, null);
  assert.equal(sold?.listing.status, "SOLD"); // detail stays visible
});

test("images: limit of 5, last photo of a live listing can't be deleted, bad files are rejected, removal purges blobs", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Pics ${tag}` }))) as { value: { id: string } };
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) { const r = await svc.addListingImage(A, id, await png()); assert.ok(r.ok); if (r.ok) ids.push(r.value.id); }
  const sixth = await svc.addListingImage(A, id, await png());
  assert.deepEqual([sixth.ok, !sixth.ok && sixth.code], [false, "limit"]);
  const junk = await svc.addListingImage(A, id, Buffer.from("not an image"));
  assert.deepEqual([junk.ok, !junk.ok && junk.code], [false, "limit"]); // limit checked first
  const positions = (await db().productImage.findMany({ where: { productId: id }, orderBy: { position: "asc" } })).map(i => i.position);
  assert.deepEqual(positions, [0, 1, 2, 3, 4]);
  for (const i of ids.slice(1)) assert.ok((await svc.deleteListingImage(A, id, i)).ok);
  assert.ok((await svc.changeListingStatus(A, id, "publish")).ok);
  const last = await svc.deleteListingImage(A, id, ids[0]);
  assert.deepEqual([last.ok, !last.ok && last.code], [false, "conflict"]);
  const { value: { id: id2 } } = (await svc.createListing(A, input({ title: `Junk ${tag}` }))) as { value: { id: string } };
  const bad = await svc.addListingImage(A, id2, Buffer.from("<svg onload=alert(1)>"));
  assert.deepEqual([bad.ok, !bad.ok && bad.code], [false, "invalid"]);
  const before = store.size();
  await svc.changeListingStatus(A, id, "remove");
  assert.ok(store.size() < before, "blobs purged on remove");
});

test("concurrent uploads never produce duplicate positions", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Race ${tag}` }))) as { value: { id: string } };
  const img = await png();
  const results = await Promise.all([1, 2, 3, 4].map(() => svc.addListingImage(A, id, img).catch(() => null)));
  const rows = await db().productImage.findMany({ where: { productId: id }, orderBy: { position: "asc" } });
  assert.equal(new Set(rows.map(r => r.position)).size, rows.length);
  assert.ok(rows.length >= 1 && rows.length <= 4);
  assert.equal(results.filter(r => r?.ok).length, rows.length);
});

test("image serving rules follow listing visibility", run, async () => {
  const { value: { id } } = (await svc.createListing(A, input({ title: `Serve ${tag}` }))) as { value: { id: string } };
  const up = await svc.addListingImage(A, id, await png());
  assert.ok(up.ok);
  const imgId = up.ok ? up.value.id : "";
  assert.equal(await svc.findImageForViewer(imgId, null), null);
  assert.equal(await svc.findImageForViewer(imgId, B), null);
  assert.equal((await svc.findImageForViewer(imgId, A))?.isPublic, false);
  await svc.changeListingStatus(A, id, "publish");
  assert.equal((await svc.findImageForViewer(imgId, null))?.isPublic, true);
  await db().user.update({ where: { id: A.id }, data: { status: "SUSPENDED" } });
  assert.equal(await svc.findImageForViewer(imgId, null), null, "suspended seller's photos are hidden");
  await db().user.update({ where: { id: A.id }, data: { status: "ACTIVE" } });
});

test("search: text, category, campus, condition, price range, sort, pagination; sold/paused excluded", run, async () => {
  const mkLive = async (actor: typeof A, over: Record<string, unknown>) => {
    const r = await svc.createListing(actor, input(over)); assert.ok(r.ok);
    if (!r.ok) return "";
    await svc.addListingImage(actor, r.value.id, await png());
    await svc.changeListingStatus(actor, r.value.id, "publish");
    return r.value.id;
  };
  await mkLive(A, { title: `Zebra cheap ${tag}`, price: 100, condition: "USED" });
  await mkLive(A, { title: `Zebra mid ${tag}`, price: 500, categorySlug: `lap-${tag}`, condition: "LIKE_NEW" });
  await mkLive(B, { title: `Zebra dear ${tag}`, price: 900, condition: "GOOD" });
  const sold = await mkLive(B, { title: `Zebra sold ${tag}` }); await svc.changeListingStatus(B, sold, "sold");
  const q = (o: object) => svc.searchListings({ q: `Zebra`, sort: "newest", page: 1, ...o } as never);
  const base = await q({ q: `zebra ${tag}`.split(" ")[0] });
  assert.ok(base.total >= 3);
  const mine = (r: Awaited<ReturnType<typeof q>>) => r.items.filter(i => i.title.startsWith("Zebra") && i.title.includes(tag));
  assert.equal(mine(await q({ q: `Zebra` })).some(i => i.title.includes("sold")), false);
  assert.equal(mine(await q({ q: tag })).length, 3);
  assert.equal(mine(await q({ q: tag, campus: `unia-${tag}` })).length, 2);
  assert.equal(mine(await q({ q: tag, campus: `unib-${tag}` })).length, 1);
  assert.equal(mine(await q({ q: tag, category: `lap-${tag}` })).length, 1);
  assert.equal(mine(await q({ q: tag, condition: "USED" })).length, 1);
  assert.equal(mine(await q({ q: tag, min: 400, max: 600 })).length, 1);
  assert.deepEqual(mine(await q({ q: tag, sort: "price_asc" })).map(i => i.price), [100, 500, 900]);
  assert.deepEqual(mine(await q({ q: tag, sort: "price_desc" })).map(i => i.price), [900, 500, 100]);
  assert.equal((await q({ q: tag, page: 99 })).items.length, 0);
  // hostile text is just text
  assert.equal((await q({ q: "'; DROP TABLE \"Product\"; --" })).total, 0);
  assert.equal((await db().product.count()) > 0, true);
  const first = mine(await q({ q: tag }))[0];
  assert.ok(first.image?.startsWith("/api/images/"));
});

test("abuse guard: open-listing cap", run, async () => {
  const c = await db().user.create({ data: { email: `${tag}-cap@campus.test`, name: "Cap", universityId: uniA, emailVerified: new Date() } });
  const actor = { id: c.id, name: "Cap", role: "STUDENT" as const, emailVerified: true, universityId: uniA };
  await db().product.createMany({ data: Array.from({ length: svc.MAX_OPEN_LISTINGS }, (_, i) => ({ sellerId: c.id, universityId: uniA, categoryId: catBooks, title: `Cap ${i}`, description: "filler filler", price: 1, condition: "GOOD" as const, pickupLocation: "x", status: "PAUSED" as const })) });
  const r = await svc.createListing(actor, input());
  assert.deepEqual([r.ok, !r.ok && r.code], [false, "limit"]);
});
