# Campus Cart threat model

Scope: the Next.js app, its API routes and server actions, Postgres (Neon), photo storage (S3-compatible), the email provider, and the CI pipeline.
Assets: student accounts and sessions, private messages and offers, listing photos, the integrity of listings and campus verification, moderator powers, and hosting cost.
Actors: anonymous visitors, malicious students, a student with a stolen session, a compromised dependency, a curious or compromised admin.

"Verified" below means checked by an automated test or a browser run in this repository. Everything else is design intent.

| Threat | Mitigation in the code | Verified by | Residual risk |
|---|---|---|---|
| Account takeover / credential stuffing | scrypt hashing; login limited per account (10 / 15 min) and per IP (30 / 15 min); generic login errors; 10-char password rule; password change needs the current password (5 / 15 min) and signs out all sessions | unit tests (auth-lib), browser runs | Limiter is per server instance; no MFA; no breached-password check |
| Session theft / fixation | Auth.js JWT in HttpOnly SameSite cookie (Secure in production), 7-day expiry, `sessionVersion` checked on every request so password change, suspension and role changes end sessions | browser: suspended user signed out at once | No device list / "log out everywhere" button |
| Broken authentication on reset / verify | single-use, SHA-256-hashed, expiring tokens; limits on register, forgot, reset, verify | unit + integration tests | Production mailer not configured (REQUIRES CONFIGURATION) |
| Broken authorization / IDOR / BOLA | user id always comes from the session, never the request; owner is part of the WHERE clause on listing writes; conversations and offers are filtered to participants; strangers get 404 | integration tests; browser: third user reading or replying in someone else's thread gets 404 | Messages / offers reads rely on service-level checks; no database row-level security |
| Privilege escalation to admin | role read from the database in every admin service call; no UI to grant admin; admins cannot suspend admins or themselves; page gate + action check + service check | integration tests (non-admin refused on every operation); browser: student redirected from every `/admin` page | A compromised admin account has wide power (mitigated only by the audit log) |
| SQL injection | Prisma parameterised queries; the only raw SQL is `SELECT 1` in the health check | code review (grep) | none known |
| XSS | React escapes all user text; no `dangerouslySetInnerHTML`; CSP with no third-party origins, `object-src 'none'`; uploaded images are re-encoded and served with `nosniff` and a sandbox CSP | browser: no CSP violations across pages; stored `<script>` in a message stays plain text (test) | CSP allows inline scripts (Next.js needs them without nonces); a nonce policy is future work |
| CSRF | server actions use Next's origin check; every cookie-authenticated JSON route requires a same-origin `Origin`; SameSite cookies | browser: missing and foreign Origin get 403 | Routes accept the `Origin` header only; no CSRF tokens |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` | header check on the built app | none known |
| Malicious file upload | sniffed by content (JPEG/PNG/WebP only), 8 MB cap, pixel cap, decode and re-encode with sharp (strips EXIF/GPS and any payload), server-generated keys, user cannot choose path or name | unit tests (images.test) | Image decoder vulnerabilities (keep `sharp` updated; dependabot is on) |
| Path traversal / SSRF | storage keys are server-generated; the server never fetches user-supplied URLs | code review | none known |
| Open redirect | `next` parameter validated by `safe-next` | unit tests | none known |
| Prompt injection / AI abuse | not applicable: the app contains no AI features and sends no data to AI providers | n/a | Revisit if AI is added |
| API abuse / spam / DoS | per-user and per-IP rate limits on every mutating endpoint; JSON body capped at 16 KB; page size caps; listing cap per seller | browser: 429 with Retry-After on messages, offers, wishlist | Limits are per instance (a shared store is needed on multi-instance hosting); no bot protection (CAPTCHA) on signup; no network-level DoS protection beyond the host |
| Enumeration | login, forgot-password and registration messages do not reveal whether an email exists | unit tests | timing differences not measured |
| Information disclosure via errors/logs | generic error bodies with a request id; structured logs with ids only; no message text, tokens or passwords logged; health endpoints return only `ok` / `unavailable` | code review; build output | log scrubbing not tested on real traffic |
| Secret exposure | secrets only in server env; `.env*` ignored; `.env.example` has placeholders; no `NEXT_PUBLIC_` secrets | local scan of the worktree and full git history found no secrets; CI runs gitleaks | A Neon password was pasted into a chat during development and must be rotated |
| Dependency / supply-chain | lockfile committed; `npm audit` in CI (high fails); dependabot weekly; few dependencies | `npm audit --omit=dev`: 0 vulnerabilities on 2026-11-17 | Transitive packages not reviewed by hand |
| Moderation abuse / false reports | one report per user per listing, 10 per day; reporter identity hidden from sellers; every action audited with a reason | integration tests | no appeal process |
| Data leakage between campuses | listing queries scoped by visibility rules; email domain decides campus at registration | tests for domain matching and overlap | not tested with several real campuses |
| Hosting cost abuse | upload, listing and message limits; image size caps | limits tested | no spend alerts configured |
