
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection: Neon's pooled (-pooler) host is for the running app and is unreliable for DDL and advisory locks.
    url: (process.env.DIRECT_URL || process.env.DATABASE_URL)!,
  },
});
