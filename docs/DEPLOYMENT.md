# Deployment notes (Vercel + Neon)

## Environments
Keep separate Neon branches / databases and separate secrets for development, staging and production. Never point a local `.env` at production.

## Environment variables (server only; none may be `NEXT_PUBLIC_`)
| Name | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Neon pooled connection string |
| `DIRECT_URL` | for migrations | Neon direct connection |
| `AUTH_SECRET` | yes | `openssl rand -base64 32`; different per environment |
| `AUTH_URL` or `AUTH_TRUST_HOST=true` | yes when not on Vercel | public https URL |
| `APP_URL` | yes | https URL used in emailed links, sitemap and robots |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET` | yes | photo storage; without them uploads return 503 in production |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | yes | Cloudflare Turnstile site key. Public by design (the only allowed `NEXT_PUBLIC_` value). Baked in at build time, so set it before the build and rebuild after changing it |
| `TURNSTILE_SECRET_KEY` | yes | Turnstile secret, server only. Without it login and sign-up refuse in production (fail closed) |
| `CRON_SECRET` | yes | 16+ random characters. Vercel sends it as a Bearer token to `/api/cron/rate-limit-cleanup`; without it that endpoint answers 503 |
| `RATE_LIMIT_STORE` | no | `postgres` (default) or `memory` (dev/test only: per instance) |
| `RL_LOGIN_IP`, `RL_LOGIN_ACCOUNT`, `RL_SIGNUP_IP`, `RL_SIGNUP_EMAIL`, `RL_FORGOT_IP`, `RL_FORGOT_EMAIL`, `RL_RESET_IP`, `RL_VERIFY_IP` | no | override default limits, see `docs/RATE_LIMITING.md` |
| `MAIL_DRIVER`, `MAIL_FROM`, `RESEND_API_KEY` or `BREVO_API_KEY` | yes | `MAIL_DRIVER=resend` or `brevo`. `MAIL_FROM` must be a sender/domain verified at the provider. With the default `log` driver, production refuses to send (sign-up still works, mails are not delivered, errors are logged as `mail_failed`) Step-by-step: `docs/EMAIL_SETUP.md`; check with `npm run mail:test -- you@example.com` |

## First deploy checklist
1. `npm run db:deploy` against the new database; confirm `prisma migrate status` is clean.
2. Seed campuses with email domains (or add them in `/admin/campuses` after granting the first admin).
3. `DATABASE_URL=... npm run admin:grant -- you@campus.edu` (account must be verified).
4. Confirm HTTPS redirect, HSTS and Secure cookies on the real domain (`curl -sI https://...`).
5. Check `/api/health/ready` returns `ok`; point an uptime monitor at it.
6. Cloudflare dashboard, Turnstile: add a widget for your production hostname, copy the site key and secret into Vercel, redeploy. Then confirm login and sign-up work, and that the Vercel cron `rate-limit-cleanup` shows a 200 in the function logs.
7. Register, verify email, post a listing with a photo, message from a second account.
8. Rotate any credential that was ever shared in chat or logs.

## Backups and recovery
Use Neon point-in-time restore and branch snapshots. Define the retention window, and run a restore into a scratch branch before launch and then regularly: a backup that has not been restored is not proven. Photos in object storage need their own versioning or backup policy.

## Monitoring (to configure)
Ship the structured JSON logs to the hosting provider's log drain. Alert on error rate, p95 latency, 5xx on `/api/health/ready`, repeated 429s and authentication failures. Set a spend alert on the database, storage and email accounts.

## Rollback
Redeploy the previous build. Migrations are forward-only; write a compensating migration rather than editing an applied one.
