import "server-only";
import { createRateLimiter } from "@/lib/auth/rate-limit";

/** CSRF defence in depth for cookie-authenticated route handlers (server actions are checked by Next itself). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // browsers always send Origin on cross-origin and on same-origin POST
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export const imageUploadLimiter = createRateLimiter({ limit: 40, windowMs: 10 * 60_000 }); // per user
export const createListingLimiter = createRateLimiter({ limit: 15, windowMs: 60 * 60_000 }); // per user
export const mutateListingLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 }); // per user
