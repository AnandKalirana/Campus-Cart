export interface RateLimitResult { ok: boolean; retryAfterSec: number }

/**
 * Fixed-window limiter held in process memory.
 * LIMITATION: state is per server instance. On serverless or multi-instance deployments use a
 * shared store (Redis/Upstash) behind this same interface. REQUIRES CONFIGURATION before launch.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): RateLimitResult {
      const t = now();
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        hits.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { ok: true, retryAfterSec: 0 };
      }
      entry.count += 1;
      if (entry.count > opts.limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
      return { ok: true, retryAfterSec: 0 };
    },
  };
}
