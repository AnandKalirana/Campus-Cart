import type { HitResult, RateLimitStore } from "./types";

/** Per-process store. Used for tests, local development and as the degraded fallback when the shared store is unreachable. */
export function createMemoryStore(now: () => number = Date.now): RateLimitStore & { size(): number } {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    name: "memory",
    size: () => hits.size,
    async hit(key: string, windowMs: number): Promise<HitResult> {
      const t = now();
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
      let e = hits.get(key);
      if (!e || e.resetAt <= t) { e = { count: 0, resetAt: t + windowMs }; hits.set(key, e); }
      e.count += 1;
      return { count: e.count, retryAfterSec: Math.max(1, Math.ceil((e.resetAt - t) / 1000)) };
    },
    async reset(key: string) { hits.delete(key); },
    async sweep(maxRows: number) {
      const t = now(); let n = 0;
      for (const [k, v] of hits) { if (n >= maxRows) break; if (v.resetAt <= t) { hits.delete(k); n++; } }
      return n;
    },
  };
}
