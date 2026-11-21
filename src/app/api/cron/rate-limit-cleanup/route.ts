import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepExpired } from "@/lib/rate-limit/shared-limiter";
import { log, requestId } from "@/lib/log";

// GET /api/cron/rate-limit-cleanup: deletes expired rate-limit rows. Called by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`. Authentication: that shared secret only (no user session). Not rate limited: the
// secret is the gate. Without CRON_SECRET configured the endpoint is off (503), never open.
// Hits also clean up a small batch opportunistically, so this job is housekeeping, not a correctness dependency.
const MAX_PER_RUN = 5000;

function authorised(header: string | null, secret: string): boolean {
  const got = Buffer.from(header ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  // Read the request header BEFORE anything else: touching request headers is what makes Next treat this route as
  // per-request. Returning earlier (e.g. on a missing env var) let it be prerendered at build time into a static 503.
  const authHeader = req.headers.get("authorization");
  const rid = requestId();
  const headers = { "cache-control": "no-store", "x-request-id": rid };
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    log("error", "cron_not_configured", { rid });
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 503, headers });
  }
  if (!authorised(authHeader, secret)) return NextResponse.json({ ok: false, code: "unauthorized" }, { status: 401, headers });
  const started = Date.now();
  try {
    const deleted = await sweepExpired(MAX_PER_RUN);
    log("info", "rate_limit_cleanup", { rid, deleted, ms: Date.now() - started });
    return NextResponse.json({ ok: true, deleted }, { headers });
  } catch (e) {
    log("error", "rate_limit_cleanup_failed", { rid, name: e instanceof Error ? e.name : "unknown" });
    return NextResponse.json({ ok: false, code: "error" }, { status: 500, headers });
  }
}
