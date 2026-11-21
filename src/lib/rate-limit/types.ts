/**
 * Storage contract for fixed-window rate limiting. The limiter (shared-limiter.ts) only talks to this interface,
 * so the backing store can change without touching any caller.
 *
 * Upstash Redis later: implement `hit` as `INCR key` + `PEXPIRE key windowMs NX` (set the TTL only when the
 * key is created) + `PTTL key`, ideally in one Lua script or pipeline; `reset` as `DEL key`; `sweep` as a no-op
 * returning 0 (TTL expires keys on its own). Then select it in `getDefaultStore()`. Nothing else changes.
 */
export interface HitResult {
  /** Hits in the current window, including this one. */
  count: number;
  /** Whole seconds until the window ends (>= 1 while the window is open). */
  retryAfterSec: number;
}

export interface RateLimitStore {
  readonly name: string;
  /** Atomically count one hit in the key's window, opening a new window if none is live. */
  hit(key: string, windowMs: number): Promise<HitResult>;
  /** Forget a key (e.g. after a successful login). */
  reset(key: string): Promise<void>;
  /** Delete up to `maxRows` expired entries; returns how many were removed. */
  sweep(maxRows: number): Promise<number>;
}

export interface LimitResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

export interface Limiter {
  check(identifier: string): Promise<LimitResult>;
  reset(identifier: string): Promise<void>;
}
