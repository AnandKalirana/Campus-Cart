import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// One client per server process. In dev, hot reload would otherwise open a new pool each edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL });
  return new PrismaClient({ adapter });
}

export function db(): PrismaClient {
  globalForPrisma.prisma ??= create();
  return globalForPrisma.prisma;
}
