import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { offerUpdateLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { markOfferSeenAs } from "@/services/purchase-request-service";

// POST /api/purchase-requests/:id/seen — the seller opened this offer.
// Auth: signed in, same-origin. Authorization: only the listing's seller; anyone else gets the same 404 as a missing id.
// Body: {} (strict). Idempotent. Rate limit: shared with offer updates.
const bodySchema = z.object({}).strict();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardJson(req, offerUpdateLimiter, bodySchema);
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  try {
    const r = await markOfferSeenAs(g.user.id, id);
    return r.ok ? g.ctx.json({ ok: true, seenAt: r.seenAt.toISOString() }) : g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  } catch (e) { return serverError(g.ctx, "offer_seen_failed", e); }
}
