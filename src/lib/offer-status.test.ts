import test from "node:test";
import assert from "node:assert/strict";
import { describeOffer, type OfferFacts } from "./offer-status";

const base: OfferFacts = { status: "PENDING", productStatus: "ACTIVE", sellerSeenAt: null, sellerMarkedSoldAt: null, buyerConfirmedAt: null };
const at = new Date("2026-11-20T10:00:00Z");

test("buyer: a new offer reads Sent, then Seen by seller once the seller opened it", () => {
  assert.equal(describeOffer(base, "buyer").label, "Sent");
  const seen = describeOffer({ ...base, sellerSeenAt: at }, "buyer");
  assert.equal(seen.label, "Seen by seller");
  assert.equal(seen.closed, false);
});

test("seller: New until opened, then Needs your reply", () => {
  assert.equal(describeOffer(base, "seller").label, "New");
  assert.equal(describeOffer({ ...base, sellerSeenAt: at }, "seller").label, "Needs your reply");
});

test("a pending offer on a listing that was sold or removed is closed for both sides", () => {
  for (const viewer of ["buyer", "seller"] as const) {
    const sold = describeOffer({ ...base, productStatus: "SOLD" }, viewer);
    assert.equal(sold.label, "Item sold"); assert.equal(sold.closed, true);
    const gone = describeOffer({ ...base, productStatus: "REMOVED" }, viewer);
    assert.equal(gone.label, "Listing removed"); assert.equal(gone.closed, true);
  }
});

test("accepted flow: Accepted -> one side confirmed -> Deal done", () => {
  const acc = { ...base, status: "ACCEPTED" as const, productStatus: "PAUSED" };
  assert.equal(describeOffer(acc, "buyer").label, "Accepted");
  assert.equal(describeOffer({ ...acc, sellerMarkedSoldAt: at }, "buyer").label, "Confirm you got it");
  assert.equal(describeOffer({ ...acc, sellerMarkedSoldAt: at }, "seller").label, "Waiting for buyer");
  assert.equal(describeOffer({ ...acc, buyerConfirmedAt: at }, "seller").label, "Confirm hand-over");
  const done = describeOffer({ ...acc, status: "COMPLETED", productStatus: "SOLD", sellerMarkedSoldAt: at }, "buyer");
  assert.equal(done.label, "Deal done"); assert.equal(done.tone, "done"); assert.equal(done.closed, true);
});

test("an accepted offer whose listing is sold reads Deal done (never stuck at Accepted)", () => {
  assert.equal(describeOffer({ ...base, status: "ACCEPTED", productStatus: "SOLD" }, "buyer").label, "Deal done");
});

test("declined and cancelled are closed and worded from each side's point of view", () => {
  assert.match(describeOffer({ ...base, status: "DECLINED" }, "buyer").detail, /seller declined/i);
  assert.match(describeOffer({ ...base, status: "DECLINED" }, "seller").detail, /You declined/);
  assert.match(describeOffer({ ...base, status: "CANCELLED" }, "seller").detail, /buyer cancelled/i);
  assert.equal(describeOffer({ ...base, status: "CANCELLED" }, "buyer").closed, true);
});
