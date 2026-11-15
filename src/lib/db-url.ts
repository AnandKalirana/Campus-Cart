// pg currently treats sslmode=prefer|require|verify-ca as verify-full and warns that pg v9 will
// switch to weaker libpq semantics. Spelling out verify-full keeps today's (stricter) behaviour
// and silences the warning. Other values (disable, verify-full, absent) are left untouched.
const LEGACY_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePgUrl(raw: string): string {
  const url = new URL(raw);
  const mode = url.searchParams.get("sslmode");
  if (mode && LEGACY_MODES.has(mode) && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}
