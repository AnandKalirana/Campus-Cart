import "server-only";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { createLimiter } from "@/lib/rate-limit/shared-limiter";

/** CSRF defence in depth for cookie-authenticated route handlers (server actions are checked by Next itself). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false; // browsers always send Origin on cross-origin and on same-origin POST
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

/**
 * Two kinds of limiter, chosen on purpose:
 *  - SHARED (createLimiter, Postgres, one atomic write per check, holds across all instances): anything that sends email,
 *    verifies a password, creates content others see, or notifies another person.
 *  - PER-INSTANCE (createRateLimiter, memory, free): high-frequency UX throttles (polling, toggles, uploads, admin clicks)
 *    where a database write per call would cost more than the abuse it prevents.
 */
export const imageUploadLimiter = createRateLimiter({ limit: 40, windowMs: 10 * 60_000 }); // per user
export const createListingLimiter = createLimiter({ scope: "create-listing", limit: 15, windowMs: 60 * 60_000 }); // per user
export const mutateListingLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 }); // per user

// Phase 5 (per user). Limits are deliberately low for anything that notifies another person.
export const wishlistLimiter = createRateLimiter({ limit: 120, windowMs: 10 * 60_000 });
export const messageSendLimiter = createLimiter({ scope: "message-send", limit: 30, windowMs: 10 * 60_000 });
export const messageDailyLimiter = createLimiter({ scope: "message-daily", limit: 300, windowMs: 24 * 60 * 60_000 });
export const offerCreateLimiter = createLimiter({ scope: "offer-create", limit: 10, windowMs: 60 * 60_000 });
export const offerUpdateLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 });
export const inboxReadLimiter = createRateLimiter({ limit: 600, windowMs: 10 * 60_000 }); // thread polling is legitimate traffic
export const profileNameLimiter = createLimiter({ scope: "profile-name", limit: 10, windowMs: 60 * 60_000 });
export const passwordChangeLimiter = createLimiter({ scope: "password-change", limit: 5, windowMs: 15 * 60_000 });
export const resendVerificationLimiter = createLimiter({ scope: "resend-verification", limit: 3, windowMs: 60 * 60_000 });

export const reportLimiter = createLimiter({ scope: "report", limit: 10, windowMs: 24 * 60 * 60_000 });
export const adminActionLimiter = createRateLimiter({ limit: 120, windowMs: 10 * 60_000 });

// Account data rights (per user). Delete requires the password, so its limit also caps password guessing from a stolen session.
export const accountExportLimiter = createLimiter({ scope: "account-export", limit: 3, windowMs: 60 * 60_000 });
export const accountDeleteLimiter = createLimiter({ scope: "account-delete", limit: 5, windowMs: 15 * 60_000 });
