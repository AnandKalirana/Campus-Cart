import { z } from "zod";
import { guardJson, guardRead, serverError, toActor } from "@/lib/api-route";
import { inboxReadLimiter, offerCreateLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { createPurchaseRequest, getPurchaseRequests } from "@/services/purchase-request-service";
import { log } from "@/lib/log";

// GET  /api/purchase-requests — the caller's own offers (as buyer) and offers on their listings (as seller).
// POST /api/purchase-requests { productId, note? } — one open offer per buyer per listing. 10 offers / hour / user.
const createSchema = z.object({ productId: idSchema, note: z.string().trim().max(500, "Keep the note under 500 characters.").optional() });

export async function GET(req: Request) {
  const g = await guardRead(req, inboxReadLimiter);
  if (!g.ok) return g.res;
  try {
    const [buyerRequests, sellerRequests] = await Promise.all([getPurchaseRequests("buyer"), getPurchaseRequests("seller")]);
    return g.ctx.json({ ok: true, buyerRequests, sellerRequests });
  } catch (e) { return serverError(g.ctx, "offers_list_failed", e); }
}

export async function POST(req: Request) {
  const g = await guardJson(req, offerCreateLimiter, createSchema);
  if (!g.ok) return g.res;
  try {
    const r = await createPurchaseRequest(toActor(g.user), g.body.productId, g.body.note);
    if (!r.ok) {
      const status = { forbidden: 403, not_found: 404, conflict: 409, limit: 429, invalid: 422 }[r.code];
      return g.ctx.json({ ok: false, code: r.code, message: r.message }, status);
    }
    log("info", "offer_created", { rid: g.ctx.rid, uid: g.user.id, pid: g.body.productId });
    return g.ctx.json({ ok: true, request: r.request }, 201);
  } catch (e) { return serverError(g.ctx, "offer_create_failed", e); }
}
