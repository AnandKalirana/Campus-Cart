import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePgUrl } from "./db-url";

test("require becomes verify-full and other params survive", () => {
  const out = new URL(normalizePgUrl("postgresql://u:p@h.neon.tech/db?sslmode=require&channel_binding=require"));
  assert.equal(out.searchParams.get("sslmode"), "verify-full");
  assert.equal(out.searchParams.get("channel_binding"), "require");
  assert.equal(out.username, "u");
  assert.equal(out.password, "p");
});
test("no sslmode (local dev) is untouched", () => {
  assert.equal(normalizePgUrl("postgresql://u:p@localhost:5432/db"), "postgresql://u:p@localhost:5432/db");
});
test("disable and verify-full are untouched; explicit libpq compat is respected", () => {
  assert.equal(new URL(normalizePgUrl("postgresql://u:p@h/db?sslmode=disable")).searchParams.get("sslmode"), "disable");
  assert.equal(new URL(normalizePgUrl("postgresql://u:p@h/db?sslmode=verify-full")).searchParams.get("sslmode"), "verify-full");
  assert.equal(new URL(normalizePgUrl("postgresql://u:p@h/db?sslmode=require&uselibpqcompat=true")).searchParams.get("sslmode"), "require");
});
