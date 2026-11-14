import { defineConfig } from "prisma/config";

// Prisma CLI commands (migrate, studio) should use Neon's DIRECT (non-pooled)
// connection when DIRECT_URL is set; migrations are not safe through PgBouncer.
// The running app uses DATABASE_URL (Neon pooled connection) via src/lib/db.ts.
// `prisma generate` and `prisma validate` work without a live database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/campus_cart",
  },
});
