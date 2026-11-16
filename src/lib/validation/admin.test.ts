import test from "node:test";
import assert from "node:assert/strict";
import { checkDomain, parseDomains, readQuery, slugify, reportInputSchema, userModerationSchema } from "./admin";

test("checkDomain accepts real campus domains and normalises them", () => {
  assert.deepEqual(checkDomain(" @TCETMumbai.in "), { ok: true, domain: "tcetmumbai.in" });
  assert.deepEqual(checkDomain("cs.uw.edu"), { ok: true, domain: "cs.uw.edu" });
});

test("checkDomain rejects things that would let strangers verify", () => {
  for (const bad of ["gmail.com", "Yahoo.in", "ac.in", "co.uk", "com", "localhost", "a b.edu", "-x.edu", "x..edu", "http://uw.edu", "uw.edu/path", "uw.edu:8080", "", "x".repeat(120) + ".edu"]) {
    assert.equal(checkDomain(bad).ok, false, bad);
  }
});

test("parseDomains: dedupes, accepts newline/comma lists, caps count, reports first bad entry", () => {
  const r = parseDomains("uw.edu\nUW.edu, cs.uw.edu");
  assert.deepEqual(r, { ok: true, domains: ["uw.edu", "cs.uw.edu"] });
  assert.deepEqual(parseDomains(""), { ok: true, domains: [] });
  assert.equal(parseDomains(Array.from({ length: 11 }, (_, i) => `a${i}.edu`).join(" ")).ok, false);
  assert.equal(parseDomains("uw.edu gmail.com").ok, false);
});

test("slugify is url-safe", () => {
  assert.equal(slugify("  Univ. of Mumbai (Kalina)  "), "univ-of-mumbai-kalina");
  assert.equal(slugify("***"), "");
});

test("readQuery never throws on junk", () => {
  assert.equal(readQuery({ page: "abc" }).page, 1);
  assert.equal(readQuery({ page: "-3" }).page, 1);
  assert.equal(readQuery({ page: "9999" }).page, 1);
  assert.equal(readQuery({ q: "x".repeat(500), page: "2" }).page, 2);
  assert.equal(readQuery({ page: "3", q: "fan" }).q, "fan");
});

test("schemas: reason lengths and id shape are enforced", () => {
  assert.equal(reportInputSchema.safeParse({ productId: "x", reason: "too short" }).success, false);
  assert.equal(reportInputSchema.safeParse({ productId: "a".repeat(25), reason: "x".repeat(501) }).success, false);
  assert.equal(reportInputSchema.safeParse({ productId: "a".repeat(25), reason: "Looks like a scam listing" }).success, true);
  assert.equal(userModerationSchema.safeParse({ userId: "a".repeat(25), decision: "suspend", reason: "no" }).success, false);
  assert.equal(userModerationSchema.safeParse({ userId: "a".repeat(25), decision: "delete", reason: "long enough" }).success, false);
});
