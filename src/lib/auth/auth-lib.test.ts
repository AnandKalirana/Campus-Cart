import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";
import { generateToken, hashToken } from "./tokens";
import { domainOf, emailMatchesDomains, normalizeEmail } from "./email-domain";
import { createRateLimiter } from "./rate-limit";
import { safeNextPath } from "./safe-next";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validation/auth";

test("password: hash verifies, wrong password and malformed hashes fail", async () => {
  const h = await hashPassword("correct horse battery");
  assert.ok(h.startsWith("scrypt$"));
  assert.equal(await verifyPassword("correct horse battery", h), true);
  assert.equal(await verifyPassword("correct horse batterz", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
  assert.equal(await verifyPassword("x", "scrypt$99999999$8$1$AAAA$AAAA"), false);
  assert.notEqual(h, await hashPassword("correct horse battery"), "salts must differ");
  assert.ok(!h.includes("correct horse battery"));
});

test("tokens: unique, long, and only the hash is derivable", () => {
  const a = generateToken(), b = generateToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 43);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), a);
  assert.match(hashToken(a), /^[0-9a-f]{64}$/);
});

test("email domains: exact and subdomain match, lookalikes rejected", () => {
  const allowed = ["iitb.ac.in", "@tcetmumbai.in"];
  assert.equal(emailMatchesDomains("a@iitb.ac.in", allowed), true);
  assert.equal(emailMatchesDomains("A@CS.IITB.AC.IN", allowed), true);
  assert.equal(emailMatchesDomains("a@tcetmumbai.in", allowed), true);
  assert.equal(emailMatchesDomains("a@evil-iitb.ac.in", allowed), false);
  assert.equal(emailMatchesDomains("a@iitb.ac.in.evil.com", allowed), false);
  assert.equal(emailMatchesDomains("a@gmail.com", allowed), false);
  assert.equal(emailMatchesDomains("a@iitb.ac.in", []), false, "no configured domains means nobody verifies");
  assert.equal(emailMatchesDomains("not-an-email", allowed), false);
  assert.equal(domainOf("x@y.z"), "y.z");
  assert.equal(normalizeEmail("  Me@X.com "), "me@x.com");
});

test("rate limiter: blocks after limit, resets after window", () => {
  let t = 0;
  const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
  assert.ok(rl.check("k").ok && rl.check("k").ok && rl.check("k").ok);
  const blocked = rl.check("k");
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.ok(rl.check("other").ok, "keys are independent");
  t = 1001;
  assert.ok(rl.check("k").ok);
});

test("safeNextPath blocks open redirects", () => {
  assert.equal(safeNextPath("/sell"), "/sell");
  assert.equal(safeNextPath("/products/1?x=2"), "/products/1?x=2");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined, "/a\nb"]) {
    assert.equal(safeNextPath(bad as string), "/", String(bad));
  }
});

test("validation: register/login/forgot/reset", () => {
  const ok = { name: "Anand K", email: " Anand@TCET.in ", password: "longenough1", universityId: "u1" };
  const parsed = registerSchema.parse(ok);
  assert.equal(parsed.email, "anand@tcet.in");
  assert.equal(registerSchema.safeParse({ ...ok, password: "short" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, password: "x".repeat(129) }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, email: "nope" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, name: "A" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, email: "same.pass@x.in", password: "same.pass@x.in" }).success, false);
  assert.equal(registerSchema.safeParse({ ...ok, role: "ADMIN" }).success && "role" in registerSchema.parse({ ...ok, role: "ADMIN" }), false, "role must never be accepted from input");
  assert.equal(loginSchema.safeParse({ email: "a@b.co", password: "" }).success, false);
  assert.equal(forgotPasswordSchema.safeParse({ email: "bad" }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ token: "short", password: "longenough1" }).success, false);
});
