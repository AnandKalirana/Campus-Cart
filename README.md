# Campus Cart

Student-to-student marketplace. *Less spending. More living.*

`/` is the marketplace itself. Browsing, search, categories and product pages need no account. Login is required only to sell, contact a seller, keep a wishlist, send purchase requests and manage an account.

## Stack
Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind 4 · AstraX (theme + base CSS) · Lucide · Framer Motion · Zod · Prisma 7 + PostgreSQL.

## Getting started
```bash
npm install            # also runs `prisma generate`
cp .env.example .env.local   # fill in values; never commit this file
npm run dev
```

### Database
```bash
npm run db:deploy      # apply committed migrations (use this for Neon and CI)
npm run db:migrate     # create a new migration during development
npm run db:seed        # categories + placeholder campuses
```
Migrations should run over the **direct** Neon connection (`DIRECT_URL`), not the pooled `-pooler` host; see `docs/DEPLOYMENT.md`.
Seeded campuses have **no email domains** on purpose. An admin must set real institutional domains before verification works.

### Photos (listings)
Photos are decoded and re-encoded on the server (JPEG/PNG/WebP in, WebP out, max 1600px, EXIF/GPS removed) and stored in a **private** S3-compatible bucket (Neon Object Storage). They are served through `/api/images/:id`, which applies the same visibility rules as the listing.
- Production needs `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and optionally `STORAGE_BUCKET`, default `assets`). Run `neon env pull` to write them to `.env.local`.
- Without them, development uses local disk (`.data/uploads`). `STORAGE_DRIVER=local` forces that (dev/CI only: ephemeral hosts lose these files). In production, missing storage config makes uploads fail safely with a 503.

### Tests
```bash
npm test                                   # unit tests
TEST_DATABASE_URL=postgresql://... AUTH_SECRET=<32+ chars> npm test   # + DB integration tests
```
Point `TEST_DATABASE_URL` at a disposable database created with `prisma migrate deploy`.

## Scripts
`dev` · `build` · `start` · `lint` · `typecheck` · `db:migrate` · `db:deploy` · `db:seed` · `db:studio`

## Status
Not launch-ready. The full, honest checklist (what is verified, what is not) is in [`docs/PRELAUNCH_REPORT.md`](docs/PRELAUNCH_REPORT.md).

| Area | State |
|---|---|
| Marketplace: browse, search, filters, campus picker, product pages | Built. The header campus picker is saved in a `cc_campus` cookie and filters browse and the home page on the server. |
| Auth: sign-up, login, email verification, password reset | Built. Shared Postgres rate limits and Cloudflare Turnstile on login and sign-up (Turnstile not yet tested against real Cloudflare). |
| Listings: create, edit, pause, mark sold, remove, photos | Built. Photo upload against Neon storage not yet verified end to end. |
| Wishlist, messaging | Built. |
| Purchase requests (no payments) | Built. Buyer sees Sent, Seen by seller, Accepted, Deal done (or Declined, Item sold, Listing removed). Seller accepts or declines from the dashboard. |
| Account export and self-service deletion | Built (profile page). |
| Admin and moderation | Built (Phase 6). |
| Email delivery | Drivers for Resend and Brevo built and unit-tested with a fake provider. **No real email sent yet.** |
| Tests and CI | 126 automated tests (unit + real-Postgres integration) and a CI pipeline (migrations, drift check, typecheck, lint, tests, build, `npm audit`, gitleaks). No committed end-to-end suite. |
| Performance, monitoring, backups | Not measured / not configured. |

The homepage shows clearly labelled **sample data** (`src/lib/catalog.ts`) only while the whole marketplace has no live listings.

## Documentation
[`docs/SECURITY.md`](docs/SECURITY.md) · [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) · [`docs/RATE_LIMITING.md`](docs/RATE_LIMITING.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · [`docs/PRELAUNCH_REPORT.md`](docs/PRELAUNCH_REPORT.md)

## Admin and moderation (Phase 6)

- **Create the first admin** (no web UI on purpose; needs database access and a verified account):
  `DATABASE_URL=... npm run admin:grant -- person@campus.edu` (revoke: `npm run admin:revoke -- ...`). The person must log in again.
- **`/admin`** (admins only; everyone else is redirected): overview, report queue, listing moderation (remove / restore), user suspension (also signs the user out), campus email-domain management, audit log.
- **Defence in depth:** the page gate (`requireAdmin`), every server action (role check, rate limit, Zod) and every `admin-service` function (re-checks ADMIN + ACTIVE in the database) each verify the caller. Every change writes an `AuditLog` row in the same transaction.
- **Students** can report a listing (`POST /api/reports`; 10 per day, one per listing, not their own). Removing a listing cancels its open offers and notifies the seller.
- **Campus domains:** free mail providers and shared suffixes (`gmail.com`, `ac.in`, ...) are rejected and domains may not overlap another campus. This is a small denylist, not a full public-suffix check; review each campus domain by hand.
- Admins cannot suspend themselves or other admins from the UI.
- Migration `20261116120000_audit_log` adds the `AuditLog` table (run `npm run db:deploy`).
