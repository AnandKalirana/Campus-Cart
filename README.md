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
npm run db:migrate -- --name init   # creates and applies the first migration
npm run db:seed                     # categories + placeholder campuses
```
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
| Area | State |
|---|---|
| Homepage, header, footer, How it works | Built. Product images are local SVG stand-ins, replace with real photos. |
| Prisma schema, DB client, env validation, seed | Built. Schema validates and the client generates. Migrations not yet created or run against a database. |
| Authentication | Built (Phase 3). |
| Listings: create/edit/pause/sold/remove, photos, search, filters, sort, campus filter, product detail, My listings | Built (Phase 4). Photo storage against Neon not yet verified end to end. |
| Wishlist, messaging, purchase requests, admin | Not started (placeholder pages). |
| Tests | Unit + DB integration tests. CI, security headers/CSP, shared rate limiter: not started. |

The homepage shows clearly labelled **sample data** (`src/lib/catalog.ts`) only while there are no live listings. Dashboard, wishlist, messages and offers are live (Phase 5).
