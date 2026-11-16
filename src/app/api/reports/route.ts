import { guardJson, serverError } from "@/lib/api-route";
import { reportLimiter } from "@/lib/request-guards";
import { reportInputSchema } from "@/lib/validation/admin";
import { createReport } from "@/services/report-service";
import { log } from "@/lib/log";

// POST /api/reports { productId, reason } — signed-in students only; 10 reports / day / user; one per listing.
// Responses: 201, 400 bad JSON, 401, 403 (own listing / cross-origin), 404, 409 already reported, 413, 422, 429.
export async function POST(req: Request) {
  const g = await guardJson(req, reportLimiter, reportInputSchema);
  if (!g.ok) return g.res;
  try {
    const r = await createReport(g.user.id, g.body.productId, g.body.reason);
    if (!r.ok) return g.ctx.json({ ok: false, code: r.code, message: r.message }, r.code === "not_found" ? 404 : r.code === "forbidden" ? 403 : 409);
    log("info", "report_created", { rid: g.ctx.rid, uid: g.user.id, pid: g.body.productId });
    return g.ctx.json({ ok: true }, 201);
  } catch (e) { return serverError(g.ctx, "report_failed", e); }
}
