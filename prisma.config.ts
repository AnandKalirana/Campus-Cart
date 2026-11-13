import { defineConfig } from "prisma/config";

// DATABASE_URL is only read by Prisma CLI commands (migrate, studio).
// `prisma generate` and `prisma validate` work without a live database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/campus_cart",
  },
});
