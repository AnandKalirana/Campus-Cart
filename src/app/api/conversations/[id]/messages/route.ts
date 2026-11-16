import { z } from "zod";
import { guardJson, guardRead, serverError, toActor } from "@/lib/api-route";
import { inboxReadLimiter, messageDailyLimiter, messageSendLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { getMessages, sendMessage } from "@/services/messaging-service";
import { log } from "@/lib/log";

// GET  /api/conversations/:conversationId/messages?cursor=<iso>&limit=1..50 — participants only; others get 404.
// POST /api/conversations/:productId/messages { body } — buyer starts or continues their thread about that listing.
//   (The path segment is a conversation id for GET but a listing id for POST. Kept for compatibility with the existing client.)
// Limits: send 30 / 10 min and 300 / day per user; reads 600 / 10 min. Body 1..2000 chars.
const sendSchema = z.object({ body: z.string().trim().min(1, "Write a message first.").max(2000, "Keep it under 2000 characters.") });
const cursorSchema = z.string().datetime().optional();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardRead(req, inboxReadLimiter);
  if (!g.ok) return g.res;
  const { id } = await params;
  const url = new URL(req.url);
  const cursor = cursorSchema.safeParse(url.searchParams.get("cursor") ?? undefined);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  if (!idSchema.safeParse(id).success || !cursor.success) return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  try {
    return g.ctx.json({ ok: true, ...(await getMessages(id, cursor.data, limit)) });
  } catch {
    return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardJson(req, messageSendLimiter, sendSchema);
  if (!g.ok) return g.res;
  const { id: productId } = await params;
  if (!idSchema.safeParse(productId).success) return g.ctx.json({ ok: false, code: "not_found", message: "Listing not found." }, 404);
  const day = messageDailyLimiter.check(g.user.id);
  if (!day.ok) return g.ctx.json({ ok: false, code: "rate_limited", message: "Daily message limit reached. Try again tomorrow." }, 429, { "retry-after": String(day.retryAfterSec) });
  try {
    const r = await sendMessage(toActor(g.user), productId, g.body.body);
    if (!r.ok) {
      const status = r.code === "forbidden" ? 403 : r.code === "not_found" ? 404 : 422;
      return g.ctx.json({ ok: false, code: r.code, message: r.message }, status);
    }
    log("info", "message_sent", { rid: g.ctx.rid, uid: g.user.id, cid: r.conversationId });
    return g.ctx.json({ ok: true, message: r.message, conversationId: r.conversationId }, 201);
  } catch (e) { return serverError(g.ctx, "message_send_failed", e); }
}
