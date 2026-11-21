import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { HitResult, RateLimitStore } from "./types";

export const SWEEP_BATCH = 500;

/**
 * Shared, atomic fixed-window counters in Postgres.
 *
 * `hit` is ONE statement (INSERT ... ON CONFLICT DO UPDATE ... -- the 0.01 absorbs the millisecond rounding of timestamptz(3) so a 60s window reports 60, not 61
        RETURNING). Postgres row-locks the key for the
 * duration, so concurrent requests from any number of server instances are serialised and each gets a distinct,
 * correct count: no read-then-write race. All time maths use the database clock (now()), never the app server's,
 * so clock skew between instances cannot make windows disagree. The column is timestamptz, so results do not
 * depend on the session time zone.
 *
 * Cost: one small indexed write per check. Use it for abuse-sensitive actions (login, signup, email sending,
 * destructive operations), not for high-frequency polling.
 */
export function createPostgresStore(opts: { sweepProbability?: number } = {}): RateLimitStore {
  const sweepProbability = opts.sweepProbability ?? 0.005;
  const store: RateLimitStore = {
    name: "postgres",
    async hit(key, windowMs): Promise<HitResult> {
      const secs = Math.max(1, Math.ceil(windowMs / 1000));
      const rows = await db().$queryRaw<{ count: number; retryAfterSec: number }[]>(Prisma.sql`
        INSERT INTO "RateLimitBucket" AS b ("key", "count", "expiresAt")
        VALUES (${key}, 1, now() + make_interval(secs => ${secs}::double precision))
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN b."expiresAt" <= now() THEN 1 ELSE b."count" + 1 END,
          "expiresAt" = CASE WHEN b."expiresAt" <= now() THEN now() + make_interval(secs => ${secs}::double precision) ELSE b."expiresAt" END
        RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM (b."expiresAt" - now())) - 0.01))::int AS "retryAfterSec"`);
      const row = rows[0];
      if (!row) throw new Error("rate limit upsert returned no row");
      // Housekeeping without a scheduler: a small share of hits clears a bounded batch of dead rows. Never blocks or fails the request.
      if (sweepProbability > 0 && Math.random() < sweepProbability) await store.sweep(SWEEP_BATCH).catch(() => 0);
      return { count: Number(row.count), retryAfterSec: Number(row.retryAfterSec) };
    },
    async reset(key) {
      await db().rateLimitBucket.deleteMany({ where: { key } });
    },
    async sweep(maxRows) {
      const n = await db().$executeRaw(Prisma.sql`
        DELETE FROM "RateLimitBucket" WHERE "key" IN (
          SELECT "key" FROM "RateLimitBucket" WHERE "expiresAt" < now() ORDER BY "expiresAt" LIMIT ${maxRows}
        )`);
      return Number(n);
    },
  };
  return store;
}
