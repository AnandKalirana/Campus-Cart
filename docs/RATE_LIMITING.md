# Rate limiting and bot protection

## What is enforced where
| Entry point | Limits (default) | Bot check | Store |
|---|---|---|---|
| Login (form **and** `/api/auth/callback/credentials`) | 30 / 15 min per IP; 10 / 15 min per **account across all IPs**, cleared by a successful login | Turnstile | shared (Postgres) |
| Sign-up | 5 / hour per IP; 3 / hour per email address (stops mail-bombing a victim) | Turnstile | shared |
| Forgot password | 5 / hour per IP; 3 / hour per address | none | shared |
| Reset password, verify email | 10 and 20 / hour per IP | none | shared |
| Create listing, send message (30 / 10 min, 300 / day), make offer, report, change name or password, resend verification, export or delete account | per user | none | shared |
| Inbox polling, wishlist toggle, photo upload, offer status change, listing edits, admin actions | per user | none | per instance (memory) |

Order for login and sign-up: **IP limit, then Turnstile, then account/email limit.** Every attempt burns the IP budget, so a bot that never solves the challenge still runs out. A failed challenge does not count against the account or email, so a stranger cannot lock someone out or mail-bomb them without passing it.

Why two kinds of store: a shared counter costs one small database write per check. That is right for anything that sends email, verifies a password, creates content others see or notifies another person. It is wasteful for high-frequency UX throttles such as thread polling, where it would add a write to every poll for little security gain.

Limits are configurable with env vars `RL_LOGIN_IP`, `RL_LOGIN_ACCOUNT`, `RL_SIGNUP_IP`, `RL_SIGNUP_EMAIL`, `RL_FORGOT_IP`, `RL_FORGOT_EMAIL`, `RL_RESET_IP`, `RL_VERIFY_IP` (integers 1 to 100000; anything else falls back to the default). Windows are fixed in code.

## How the shared limiter works
`src/lib/rate-limit/`
- `types.ts`: the `RateLimitStore` interface (`hit`, `reset`, `sweep`). The limiter only talks to this.
- `postgres-store.ts`: `hit` is **one** `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement. Postgres locks the row, so concurrent requests from any instance get distinct, correct counts. Time comes from the database (`now()`), so clock skew between instances cannot matter. The column is `timestamptz`, so nothing depends on a session time zone.
- `shared-limiter.ts`: `createLimiter({ scope, limit, windowMs })`. Keys are `HMAC-SHA256(AUTH_SECRET, scope + identifier)`, so the table holds no raw IPs or emails.
- Failure behaviour: if the store errors, the limiter falls back to a per-instance counter and logs `ratelimit_store_unavailable` (at most one line a minute). It does **not** fail open and does not throw into the request.
- Algorithm: fixed window. A client can burst up to twice the limit across a window boundary. Acceptable for these limits; a sliding window would cost more writes.

## Cleanup of expired rows
1. **Opportunistic:** about 0.5 % of hits delete up to 500 expired rows (bounded, errors ignored).
2. **Scheduled:** `vercel.json` runs `GET /api/cron/rate-limit-cleanup` daily at 03:00 UTC (the most frequent schedule the Vercel Hobby plan allows). It requires `Authorization: Bearer $CRON_SECRET` (Vercel sends this automatically when `CRON_SECRET` is set; use at least 16 random characters). Without `CRON_SECRET` the endpoint answers 503, never open. Deletes at most 5000 rows per run.
Expired rows are already ignored by the limiter (the next hit restarts the window), so cleanup is housekeeping for table size, not correctness.

## Cloudflare Turnstile
- Widget on login and sign-up (`src/components/forms/turnstile.tsx`), verified server-side by `src/lib/turnstile.ts`.
- **Verification runs inside Auth.js `authorize`**, not only in the form action. Auth.js also exposes `/api/auth/callback/credentials`; a bot posting there directly would otherwise skip the check. This was tested (see below).
- Not configured in development or test: skipped. **Not configured in production: fails closed** (login and sign-up refuse, `turnstile_not_configured` is logged). Cloudflare unreachable or slow (5 s): fails closed, `turnstile_unreachable`.
- Site key `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is public by design and is baked in at **build** time. The secret `TURNSTILE_SECRET_KEY` is server-only.
- CSP allows `challenges.cloudflare.com` for script, frame and connect. It is the only third-party origin the site loads.
- `TURNSTILE_VERIFY_URL` exists only so tests can point at a fake verifier. Only `http://localhost` or `http://127.0.0.1` values are honoured; anything else is ignored with a warning. Never set it in production.

## Migrating to Upstash Redis later
Implement `RateLimitStore` for Upstash and select it in `getDefaultStore()`:
- `hit`: `INCR key`, then `PEXPIRE key windowMs NX` (TTL only when the key is created), then `PTTL key` for retry-after. Do it in one Lua script or pipeline so it stays atomic.
- `reset`: `DEL key`. `sweep`: return 0 (TTL expires keys).
- Keep the HMAC keys. Add the new store to `rate-limit.test.ts` (the concurrency and shared-instance tests are written against the interface), switch `RATE_LIMIT_STORE`, then drop the table in a later migration.
Move when Postgres limiter writes show up in slow-query or connection-pool metrics. Not measured yet.

## Known limits (read these)
- **Client IP trust.** The IP comes from `x-vercel-forwarded-for`, then `x-real-ip`, then the first `x-forwarded-for` entry, and must parse as an IP. On Vercel the platform sets these and clients cannot choose them. Behind any other proxy, make sure it strips client-supplied forwarding headers, or IP limits can be dodged by spoofing.
- **Account lockout is a trade-off.** Someone who passes Turnstile can use up a victim's 10 login attempts and block them for up to 15 minutes. Turnstile and the per-IP cap make this costly, and a successful login or waiting clears it, but it is possible.
- **IPv6.** Counted per full address. A client with a large IPv6 range can rotate addresses; the per-account and per-email limits still apply.
- **Timing.** Sign-up and reset responses are identical in content for existing and unknown emails, but the awaited email send can still differ in latency.
- Forgot-password and the API endpoints have no CAPTCHA; they rely on the limits above.
- Per-instance limiters (the last table row) are still not shared across instances.

## What was tested
See `src/lib/rate-limit/rate-limit.test.ts`, `src/lib/auth/abuse-guard.test.ts`, `src/lib/turnstile.test.ts`, `src/app/api/cron/rate-limit-cleanup/route.test.ts`, plus a Chromium run against a production build with a fake verifier. Not tested: real Cloudflare (the sandbox cannot reach it), real multi-instance Vercel traffic, load or latency of the Postgres limiter on Neon.
