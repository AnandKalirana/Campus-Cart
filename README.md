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

## Scripts
`dev` · `build` · `start` · `lint` · `typecheck` · `db:migrate` · `db:deploy` · `db:seed` · `db:studio`

## Status
| Area | State |
|---|---|
| Homepage, header, footer, How it works | Built. Product images are local SVG stand-ins, replace with real photos. |
| Prisma schema, DB client, env validation, seed | Built. Schema validates and the client generates. Migrations not yet created or run against a database. |
| Authentication, listings, wishlist, messaging, requests, admin | Not started (placeholder pages). |
| Tests, CI, security headers, rate limiting | Not started. |

Homepage products are **demo data** (`src/lib/catalog.ts`), not real inventory.
