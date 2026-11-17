# Campus Cart: pre-launch engineering report (living draft)

Status as of 2026-11-17. **The application is NOT launch-ready.** This report lists what is verified and what is not. PASS means it was verified by a test or a browser run in this repository. Nothing here is a security certification or a legal-compliance claim.

Legend: `[PASS]` verified · `[FAIL]` known gap · `[NOT TESTED]` exists or is assumed but unverified · `[REQUIRES CONFIGURATION]` needs deployment-time setup.

## Architecture
Next.js 16 (App Router, Turbopack, `cacheComponents`), React 19, TypeScript, Tailwind 4. Prisma 7 + PostgreSQL (Neon). Auth.js v5. Photos in S3-compatible storage (local disk in development). Layers: UI, then route handlers and server actions (auth, same-origin, rate limit, Zod), then services (authorization and business rules), then Prisma. No payments; purchase requests only.

## Security
See `docs/SECURITY.md` and `docs/THREAT_MODEL.md`. Biggest open items: per-instance rate limiter, no bot protection, no MFA, production mailer, CSP allows inline scripts, no external review.

## Privacy
Data collected is described in the draft Privacy Policy (placeholders to fill). No analytics, no ad trackers, no AI providers, only essential cookies. Account self-deletion and data export are not built. Log and backup retention periods are undefined.

## Performance
No Lighthouse, Core Web Vitals, bundle or database query measurements have been taken. Do not claim any performance result.

## Testing
53 automated tests (unit and integration against Postgres 16) plus Playwright browser runs (not committed to the repo) for marketplace, messaging, offers, admin, access control and accessibility. No committed end-to-end suite, no load tests.

## AI
No AI features exist. Sections of the standard that concern AI are not applicable today.

## Mobile
Responsive web only (checked at 375px for horizontal scroll). No native app; Android and iOS device testing not done.

## Deployment
Vercel + Neon planned; see `docs/DEPLOYMENT.md`. CI workflow is in `.github/workflows/ci.yml`; it ran green on GitHub for PR #18 (2026-11-17).

## Remaining risks (most important first)
1. Rate limits and login throttling reset on restart and are not shared between instances.
2. Production email: provider drivers (Resend, Brevo) are implemented and unit-tested against a fake `fetch`, but no real email has been sent. Needs a provider account, a verified sender, and the env vars in `docs/DEPLOYMENT.md`.
3. Real photo upload to Neon object storage has not been run end to end; the Neon database password was shared in chat and must be rotated.
4. No account deletion / data export; legal pages are drafts with placeholders.
5. No performance, screen-reader (human), Lighthouse or cross-browser testing; no monitoring or backup restore drill.
6. No bot protection on signup; messaging and offers do not require a verified email.
7. Streamed pages return HTTP 200 for not-found content (framework behaviour with `cacheComponents`).

## Launch checklist

### Security
- [PASS] No secrets in source (worktree and full git history scanned locally on 2026-11-17; CI gitleaks job also passed on GitHub, 2026-11-17)
- [PASS] No secrets in Git history by an independent tool (gitleaks, full history, CI run on PR #18)
- [REQUIRES CONFIGURATION] HTTPS (HTTP to HTTPS redirect, HSTS header is set in production builds but unverified on a real domain)
- [REQUIRES CONFIGURATION] Secure cookies (production flag set by Auth.js; verify on the real domain)
- [PASS] Authentication (login, registration, verify, reset flows tested)
- [PASS] Authorization (service-level checks, tests, browser runs)
- [PASS] IDOR/BOLA protection on threads, offers, listings, admin
- [PASS] Input validation (server side, Zod) on every route and action
- [PASS] Output handling / XSS (React escaping, no raw HTML; stored script text stays text)
- [PASS] CSRF assessment (same-origin checks; see threat model)
- [PASS] SQL injection protection (parameterised queries only)
- [PASS] SSRF: not applicable (no user-supplied URL fetching)
- [PASS] Rate limiting present on all mutating endpoints
- [FAIL] Rate limiting is shared across instances
- [FAIL] Bot protection (none)
- [PASS] Security headers present on the built app
- [NOT TESTED] Security headers on the deployed domain (securityheaders.com or similar)
- [PASS] CORS: no cross-origin access is enabled; APIs reject foreign Origin on mutations
- [PASS] Dependency audit (0 vulnerabilities in production deps on 2026-11-17)
- [PASS] Secret scanning in CI (gitleaks job passed on PR #18)
- [PASS] Error sanitization (generic bodies, request ids)
- [NOT TESTED] Logging review on real traffic
- [PASS] Database security: constraints, FKs, parameterised access (no Supabase RLS; not used)
- [PASS] AI endpoint protection: not applicable
- [PASS] AI prompt injection / output validation / cost limits: not applicable

### Privacy
- [FAIL] Privacy Policy (draft with placeholders, not reviewed)
- [FAIL] Terms & Conditions (draft with placeholders, not reviewed)
- [PASS] Cookie notice (essential cookies only; consent not required while no optional cookies exist)
- [PASS] Data minimization (no location, no analytics, no payments)
- [FAIL] Data retention defined (log, backup and inactive-account periods are placeholders)
- [PASS] Third-party AI data handling: no AI providers used
- [PASS] Analytics privacy: no analytics
- [FAIL] Account / data deletion (not built)

### Performance
- [NOT TESTED] Lighthouse
- [NOT TESTED] Core Web Vitals
- [PASS] Images re-encoded to WebP at most 1600px on upload
- [NOT TESTED] Lazy loading review
- [NOT TESTED] Bundle size review
- [NOT TESTED] API latency
- [NOT TESTED] Database query review and indexes under load
- [NOT TESTED] Mobile performance

### Accessibility
- [PASS] axe (WCAG 2 A/AA, best practice) clean on tested pages: marketplace, product, sell, dashboard, messages, admin, dialogs
- [NOT TESTED] Screen-reader testing by a person
- [NOT TESTED] Full keyboard walkthrough of every flow (focus handling in dialogs was exercised)
- [PASS] Colour contrast on tested pages (axe)
- [NOT TESTED] Reduced-motion behaviour

### SEO
- [PASS] Page titles and descriptions; Open Graph basics
- [FAIL] Social preview image (none)
- [NOT TESTED] Favicon on all platforms
- [PASS] Sitemap and robots.txt
- [NOT TESTED] Canonical URLs
- [PASS] Private areas not indexed (robots.txt and X-Robots-Tag)

### Functionality
- [NOT TESTED] No broken links (no crawl run; Help, Safety and How-it-works pages are partly placeholders)
- [PASS] Marketplace, listing create/edit/status, photos, wishlist, messaging, offers, reports, admin
- [PASS] Loading, empty and error states on tested flows
- [PASS] Custom 404 and global error pages
- [REQUIRES CONFIGURATION] Email flows end to end (drivers tested with a fake provider; no real delivery tested)
- [NOT TESTED] Real Neon storage upload

### DevOps
- [NOT TESTED] Environment separation (documented, not set up)
- [PASS] CI checks (prisma validate, migrate deploy, drift check, typecheck, lint, 53 tests, build, npm audit all green on PR #18)
- [PASS] Build passes locally; tests pass locally
- [PASS] Deployment documented
- [REQUIRES CONFIGURATION] Monitoring and alerting
- [PASS] Health checks (`/api/health`, `/api/health/ready`)
- [REQUIRES CONFIGURATION] Database backups
- [NOT TESTED] Recovery / restore drill
