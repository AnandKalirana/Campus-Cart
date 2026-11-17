# Security notes

This file says what is in place, what was actually tested, and what is not. It is not a certification and no external review has been done.

## Controls in place
- **Authentication:** Auth.js v5 credentials, scrypt password hashes, 7-day JWT sessions in HttpOnly cookies, single-use hashed tokens for verify and reset, `sessionVersion` revocation.
- **Authorization:** checked in the service layer on every request. Ids from the session, never from the client. Admin role re-read from the database.
- **Input validation:** Zod schemas on every route and server action (server side). Client validation is for convenience only.
- **Rate limiting:** see `src/lib/request-guards.ts` and `src/lib/auth`. In-memory, per instance.
- **CSRF:** same-origin check on JSON routes; Next.js origin check for server actions.
- **Headers:** CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS (production only). Private areas send `X-Robots-Tag: noindex`.
- **Uploads:** content sniffing, re-encode, EXIF stripping, size and pixel limits, server-chosen keys.
- **Errors and logs:** safe messages, request ids, structured JSON logs without secrets or message text.
- **Audit:** `AuditLog` for admin actions, written in the same transaction as the change.
- **Health:** `/api/health` (liveness) and `/api/health/ready` (database reachable).

## Tested (automated or browser)
Authorization (IDOR on threads, offers, listings; admin pages and operations), same-origin and invalid-JSON handling, validation limits, rate limits tripping, suspended-user lockout, upload rejection cases, CSP not breaking login, pages, images or uploads (no violations reported by Chromium), accessibility (axe) on main pages.

## Not tested / not done
- No penetration test, no external review, no fuzzing, no load test.
- Rate limiting across several server instances (needs a shared store).
- Real email delivery, real object storage upload against Neon, real HTTPS (HSTS, Secure cookies) on a deployed domain.
- CSP uses `'unsafe-inline'` for scripts and styles (Next.js inline bootstrap); a nonce-based policy was not attempted.
- Bot protection on signup, MFA, breached-password checks, account deletion and data export, cookie consent (not needed while only essential cookies are set).
- Screen-reader testing by a person; Lighthouse / Core Web Vitals measurements.

## Reporting a vulnerability
[SECURITY EMAIL: to be set by the operator]
