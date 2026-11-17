import { db } from "@/lib/db";
import { log } from "@/lib/log";

// GET /api/health/ready — readiness: can we reach the database within 3 s? Returns only ok / unavailable (never error text, hosts or versions).
export async function GET() {
  const headers = { "cache-control": "no-store" };
  try {
    await Promise.race([
      db().$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    return Response.json({ status: "ok" }, { headers });
  } catch (e) {
    log("error", "health_ready_failed", { name: e instanceof Error ? e.message : "unknown" });
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
