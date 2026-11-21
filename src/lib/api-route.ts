import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { isSameOrigin } from "@/lib/request-guards";
import { log, requestId } from "@/lib/log";

type Limiter = { check(key: string): { ok: boolean; retryAfterSec: number } | Promise<{ ok: boolean; retryAfterSec: number }> };

export const MAX_JSON_BYTES = 16 * 1024;

export interface ApiCtx { rid: string; json: (body: object, status?: number, headers?: Record<string, string>) => NextResponse }
export type Guarded<T> = { ok: true; user: CurrentUser; body: T; ctx: ApiCtx } | { ok: false; res: NextResponse };

function makeCtx(): ApiCtx {
  const rid = requestId();
  return { rid, json: (body, status = 200, headers) => NextResponse.json(body, { status, headers: { "x-request-id": rid, "cache-control": "no-store", ...headers } }) };
}

async function authAndLimit(req: Request, limiter: Limiter, opts: { mutating: boolean }) {
  const ctx = makeCtx();
  // Order matters: cheap rejections first, and nothing about the account is revealed to a cross-site caller.
  if (opts.mutating && !isSameOrigin(req)) return { fail: ctx.json({ ok: false, code: "blocked", message: "Request blocked." }, 403) };
  const user = await getCurrentUser();
  if (!user) return { fail: ctx.json({ ok: false, code: "unauthorized", message: "Please log in again." }, 401) };
  const rl = await limiter.check(user.id);
  if (!rl.ok) {
    log("warn", "rate_limited", { rid: ctx.rid, uid: user.id });
    return { fail: ctx.json({ ok: false, code: "rate_limited", message: "Too many requests. Please slow down and try again shortly." }, 429, { "retry-after": String(rl.retryAfterSec) }) };
  }
  return { user, ctx };
}

/** Mutating JSON endpoint: same-origin, authenticated, rate-limited, size-capped, schema-validated (400 bad JSON, 422 bad shape). */
export async function guardJson<T>(req: Request, limiter: Limiter, schema: ZodType<T>): Promise<Guarded<T>> {
  const g = await authAndLimit(req, limiter, { mutating: true });
  if ("fail" in g) return { ok: false, res: g.fail! };
  const { user, ctx } = g as { user: CurrentUser; ctx: ApiCtx };
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_JSON_BYTES) return { ok: false, res: ctx.json({ ok: false, code: "too_large", message: "Request too large." }, 413) };
  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) return { ok: false, res: ctx.json({ ok: false, code: "too_large", message: "Request too large." }, 413) };
    raw = JSON.parse(text);
  } catch { return { ok: false, res: ctx.json({ ok: false, code: "bad_json", message: "Invalid request." }, 400) }; }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, res: ctx.json({ ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid input." }, 422) };
  return { ok: true, user, body: parsed.data, ctx };
}

/** Read-only endpoint (GET): authenticated and rate-limited. */
export async function guardRead(req: Request, limiter: Limiter): Promise<Guarded<null>> {
  const g = await authAndLimit(req, limiter, { mutating: false });
  if ("fail" in g) return { ok: false, res: g.fail! };
  const { user, ctx } = g as { user: CurrentUser; ctx: ApiCtx };
  return { ok: true, user, body: null, ctx };
}

export function serverError(ctx: ApiCtx, event: string, e: unknown) {
  log("error", event, { rid: ctx.rid, name: e instanceof Error ? e.name : "unknown" });
  return ctx.json({ ok: false, code: "error", message: "We couldn't complete that. Please try again." }, 500);
}

export const toActor = (u: CurrentUser) => ({ id: u.id, name: u.name, role: u.role, emailVerified: u.emailVerified, universityId: u.universityId });
