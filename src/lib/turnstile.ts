import "server-only";
import { log } from "@/lib/log";

/**
 * Cloudflare Turnstile server-side verification.
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY   public by design (rendered in the page)
 *   TURNSTILE_SECRET_KEY             server only, never NEXT_PUBLIC_
 *
 * Policy:
 *  - Not configured + development/test  -> skipped (so local work and CI need no Cloudflare account).
 *  - Not configured + production        -> FAILS CLOSED and logs. A forgotten secret must not silently disable bot protection.
 *  - Cloudflare unreachable / slow      -> fails closed (5s timeout, no retry; the user can just try again).
 *  - Token missing, malformed or rejected -> fails.
 * Turnstile is one layer: the rate limits in src/lib/auth/abuse-guard.ts apply whether or not the challenge passes.
 */
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;
const MAX_TOKEN_LENGTH = 2048; // Cloudflare documents tokens up to 2048 chars

export type CaptchaResult = { ok: true; skipped?: boolean } | { ok: false; reason: "missing" | "rejected" | "unavailable" | "not_configured" };

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** Test-only escape hatch: loopback http URLs are honoured so end-to-end tests can use a fake verifier. Anything else is ignored. */
export function verifyUrl(override = process.env.TURNSTILE_VERIFY_URL): string {
  if (!override) return TURNSTILE_VERIFY_URL;
  try {
    const u = new URL(override);
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return override;
  } catch { /* fall through */ }
  log("warn", "turnstile_verify_url_ignored");
  return TURNSTILE_VERIFY_URL;
}

export function turnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: string | undefined | null, remoteIp: string | undefined, fetchFn: FetchLike = fetch as unknown as FetchLike): Promise<CaptchaResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      log("error", "turnstile_not_configured");
      return { ok: false, reason: "not_configured" };
    }
    return { ok: true, skipped: true };
  }
  if (!token || token.length > MAX_TOKEN_LENGTH || /\s/.test(token)) return { ok: false, reason: "missing" };
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
  try {
    const res = await fetchFn(verifyUrl(), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) { log("warn", "turnstile_http_error"); return { ok: false, reason: "unavailable" }; }
    const data = (await res.json()) as { success?: unknown; "error-codes"?: unknown };
    if (data.success === true) return { ok: true };
    // Error codes are fixed Cloudflare strings (e.g. timeout-or-duplicate), safe to log; the token and secret never are.
    const codes = Array.isArray(data["error-codes"]) ? data["error-codes"].filter((c): c is string => typeof c === "string").slice(0, 3).join(",") : "";
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) log("error", "turnstile_bad_secret");
    return { ok: false, reason: "rejected" };
  } catch {
    log("warn", "turnstile_unreachable");
    return { ok: false, reason: "unavailable" };
  }
}
