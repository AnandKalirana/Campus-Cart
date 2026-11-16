import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { wishlistLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { setSaved } from "@/services/wishlist-service";

// POST /api/wishlist  { productId, saved }
// Auth: required. Authz: acts only on the caller's own wishlist (user id comes from the session, never the body).
// Limit: 120 / 10 min / user. Errors: 400 bad JSON, 401, 403 cross-origin, 404, 413, 422, 429, 500.
const schema = z.object({ productId: idSchema, saved: z.boolean() });

export async function POST(req: Request) {
  const g = await guardJson(req, wishlistLimiter, schema);
  if (!g.ok) return g.res;
  try {
    const r = await setSaved(g.user.id, g.body.productId, g.body.saved);
    if (!r.ok) return g.ctx.json({ ok: false, code: "not_found", message: "Listing not found." }, 404);
    return g.ctx.json({ ok: true, saved: r.saved });
  } catch (e) { return serverError(g.ctx, "wishlist_failed", e); }
}
