import test from "node:test";
import assert from "node:assert/strict";
import { listingInputSchema, parseSearchParams } from "@/lib/validation/listing";

const ok = { title: "MacBook Air", description: "Barely used, with charger.", categorySlug: "laptops", condition: "LIKE_NEW", price: "35000", originalPrice: "", pickupLocation: "Library entrance" };
const bad = (over: Record<string, unknown>) => listingInputSchema.safeParse({ ...ok, ...over });

test("valid listing parses; empty original price becomes undefined", () => {
  const r = bad({});
  assert.ok(r.success);
  assert.equal(r.data.price, 35000);
  assert.equal(r.data.originalPrice, undefined);
});

test("negative inputs: price, title, description, condition, lengths", () => {
  for (const over of [
    { price: "-5" }, { price: "0" }, { price: "12.5" }, { price: "abc" }, { price: "99999999" }, { price: "" },
    { title: "ab" }, { title: "x".repeat(121) }, { title: "   " }, { description: "short" }, { description: "x".repeat(2001) },
    { condition: "MINT" }, { condition: "" }, { pickupLocation: "" }, { categorySlug: "" },
    { originalPrice: "100", price: "200" },
  ]) assert.equal(bad(over).success, false, JSON.stringify(over));
});

test("control characters are stripped, markup is kept as inert text", () => {
  const r = bad({ title: "Hi\u0000 <script>alert(1)</script>" });
  assert.ok(r.success);
  assert.ok(!r.data.title.includes("\u0000"));
  assert.ok(r.data.title.includes("<script>")); // stored as text; React escapes it on render
});

test("search params: garbage falls back to safe defaults, never throws", () => {
  const p = parseSearchParams({ q: "x".repeat(500), page: "-3", sort: "drop table", min: "abc", max: ["5", "6"], condition: "BAD", category: "../etc", campus: "ok-campus" });
  assert.equal(p.q, undefined);
  assert.equal(p.page, 1);
  assert.equal(p.sort, "newest");
  assert.equal(p.min, undefined);
  assert.equal(p.max, 5);
  assert.equal(p.condition, undefined);
  assert.equal(p.category, undefined);
  assert.equal(p.campus, "ok-campus");
  assert.equal(parseSearchParams({ page: "99999" }).page, 1);
});
