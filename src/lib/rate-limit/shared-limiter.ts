import "server-only";
import { createHmac } from "node:crypto";
import { log } from "@/lib/log";
import { createMemoryStore } from "./memory-store";
import { createPostgresStore } from "./postgres-store";
import type { LimitResult, Limiter, RateLimitStore } from "./types";

let defaultStore: RateLimitStore | undefined;

/** RATE_LIMIT_STORE=postgres (default) | memory. `memory` is per-instance: development and tests only. */
export function getDefaultStore(): RateLimitStore {
  if (defaultStore) return defaultStore;
  defaultStore = process.env.RATE_LIMIT_STORE === "memory" ? createMemoryStore() : createPostgresStore();
  return defaultStore;
}
export function __setDefaultStoreForTests(s: RateLimitStore | undefined) { defaultStore = s; }

/**
 * Keys are HMAC(AUTH_SECRET) of the identifier, so the table never holds raw IP addresses or emails and a DB leak
 * does not reveal who was rate-limited. Rotating AUTH_SECRET just resets all counters.
 */
export function limitKey(scope: string, identifier: string): string {
  const mac = createHmac("sha256", process.env.AUTH_SECRET ?? "unkeyed-dev").update(`${scope}\0${identifier}`).digest("base64url").slice(0, 32);
  return `${scope}:${mac}`;
}

let lastWarn = 0;
function warnStoreDown(scope: string, store: string, e: unknown) {
  const t = Date.now();
  if (t - lastWarn < 60_000) return; // one line a minute, not one per request
  lastWarn = t;
  log("error", "ratelimit_store_unavailable", { scope, store, name: e instanceof Error ? e.name : "unknown" });
}

/**
 * A named limit: at most `limit` hits per `windowMs` per identifier, counted in the shared store.
 * If the shared store errors, this falls back to a per-instance memory counter (still limiting, just not globally)
 * and logs; it never fails open and never throws into the caller.
 */
export function createLimiter(opts: { scope: string; limit: number; windowMs: number; store?: RateLimitStore }): Limiter {
  const fallback = createMemoryStore();
  const result = (count: number, retryAfterSec: number): LimitResult => ({ ok: count <= opts.limit, retryAfterSec: count <= opts.limit ? 0 : retryAfterSec, remaining: Math.max(0, opts.limit - count) });
  return {
    async check(identifier) {
      const key = limitKey(opts.scope, identifier);
      const store = opts.store ?? getDefaultStore();
      try {
        const r = await store.hit(key, opts.windowMs);
        return result(r.count, r.retryAfterSec);
      } catch (e) {
        warnStoreDown(opts.scope, store.name, e);
        const r = await fallback.hit(key, opts.windowMs);
        return result(r.count, r.retryAfterSec);
      }
    },
    async reset(identifier) {
      const key = limitKey(opts.scope, identifier);
      await fallback.reset(key);
      try { await (opts.store ?? getDefaultStore()).reset(key); } catch (e) { warnStoreDown(opts.scope, "reset", e); }
    },
  };
}

/** For the cleanup job. */
export async function sweepExpired(maxRows = 5000): Promise<number> {
  return getDefaultStore().sweep(maxRows);
}
