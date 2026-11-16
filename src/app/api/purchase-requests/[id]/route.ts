import { z } from "zod";
import { guardJson, guardRead, serverError } from "@/lib/api-route";
import { inboxReadLimiter, offerUpdateLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { getPurchaseRequest, updatePurchaseRequestStatus } from "@/services/purchase-request-service";
import { log } from "@/lib/log";

// GET   /api/purchase-requests/:id — buyer or seller of that offer only; others get 404.
// PATCH /api/purchase-requests/:id { status } — the service enforces who may make which transition.
const updateSchema = z.object({ status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]) });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardRead(req, inboxReadLimiter);
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  try {
    const request = await getPurchaseRequest(id);
    return request ? g.ctx.json({ ok: true, request }) : g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  } catch (e) { return serverError(g.ctx, "offer_get_failed", e); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardJson(req, offerUpdateLimiter, updateSchema);
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  try {
    const r = await updatePurchaseRequestStatus(id, g.body.status);
    if (!r.ok) {
      const status = { forbidden: 403, not_found: 404, conflict: 409, limit: 429, invalid: 422 }[r.code];
      return g.ctx.json({ ok: false, code: r.code, message: r.message }, status);
    }
    log("info", "offer_status_changed", { rid: g.ctx.rid, uid: g.user.id, oid: id, to: g.body.status });
    return g.ctx.json({ ok: true, request: r.request });
  } catch (e) { return serverError(g.ctx, "offer_update_failed", e); }
}
