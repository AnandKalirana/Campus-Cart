import { createRateLimiter } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";

// `values` echoes non-secret fields back so React 19's post-action form reset doesn't wipe what the user typed. Never put passwords here.
export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

export async function ipFromHeaders(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Per-instance limiters (see rate-limit.ts). Tight on anything that sends email or hashes passwords.
export const registerLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });
export const forgotLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });
export const resetLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
export const verifyLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60_000 });

export const TOO_MANY: FormState = { message: "Too many attempts. Please wait a bit and try again." };
export const GENERIC_ERROR: FormState = { message: "We couldn't complete your request. Please try again." };

export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}
