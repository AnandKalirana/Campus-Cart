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

// Phase 5 (per user). Limits are deliberately low for anything that notifies another person.
export const wishlistLimiter = createRateLimiter({ limit: 120, windowMs: 10 * 60_000 });
export const messageSendLimiter = createRateLimiter({ limit: 30, windowMs: 10 * 60_000 });
export const messageDailyLimiter = createRateLimiter({ limit: 300, windowMs: 24 * 60 * 60_000 });
export const offerCreateLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
export const offerUpdateLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 });
export const inboxReadLimiter = createRateLimiter({ limit: 600, windowMs: 10 * 60_000 }); // thread polling is legitimate traffic
export const profileNameLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60_000 });
export const passwordChangeLimiter = createRateLimiter({ limit: 5, windowMs: 15 * 60_000 });
export const resendVerificationLimiter = createRateLimiter({ limit: 3, windowMs: 60 * 60_000 });

export const reportLimiter = createRateLimiter({ limit: 10, windowMs: 24 * 60 * 60_000 });
export const adminActionLimiter = createRateLimiter({ limit: 120, windowMs: 10 * 60_000 });
