import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { effectiveCampus } from "./campus-cookie";
import { CAMPUSES, CAMPUS_SLUG, DEFAULT_CAMPUS_SLUG } from "./campuses";

const known = ["university-of-washington", "tcet-mumbai", "iit-bombay"];
const fb = "university-of-washington";

test("the saved cookie decides when the URL has no campus", () => {
  assert.equal(effectiveCampus(undefined, "tcet-mumbai", known, fb), "tcet-mumbai");
});
test("an explicit ?campus= beats the cookie, and 'all' means every campus", () => {
  assert.equal(effectiveCampus("iit-bombay", "tcet-mumbai", known, fb), "iit-bombay");
  assert.equal(effectiveCampus("all", "tcet-mumbai", known, fb), undefined);
});
test("no cookie falls back to the default campus; the fallback is only used if it exists", () => {
  assert.equal(effectiveCampus(undefined, undefined, known, fb), fb);
  assert.equal(effectiveCampus(undefined, undefined, ["tcet-mumbai"], fb), undefined);
});
test("unknown or malformed values are ignored, never trusted", () => {
  assert.equal(effectiveCampus("nope", "tcet-mumbai", known, fb), "tcet-mumbai");
  assert.equal(effectiveCampus(undefined, "Robert'); DROP TABLE--", known, fb), fb);
  assert.equal(effectiveCampus("../etc", undefined, known, fb), fb);
});
test("every campus in the picker has the slug that prisma/seed.ts creates (so the cookie matches a real row)", () => {
  const seed = readFileSync("prisma/seed.ts", "utf8");
  for (const name of CAMPUSES) assert.ok(seed.includes(`["${name}", "${CAMPUS_SLUG[name]}"]`), `seed.ts has no ["${name}", "${CAMPUS_SLUG[name]}"]`);
  assert.equal(DEFAULT_CAMPUS_SLUG, CAMPUS_SLUG[CAMPUSES[0]]);
});
