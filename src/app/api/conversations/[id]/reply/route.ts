import { z } from "zod";
import { guardJson, serverError, toActor } from "@/lib/api-route";
import { messageDailyLimiter, messageSendLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { replyInConversation } from "@/services/messaging-service";
import { log } from "@/lib/log";

// POST /api/conversations/:conversationId/reply { body } — buyer OR seller replies in a thread they belong to.
// Strangers and unknown ids both get 404. Limits shared with starting a thread: 30 / 10 min and 300 / day per user.
const schema = z.object({ body: z.string().trim().min(1, "Write a message first.").max(2000, "Keep it under 2000 characters.") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardJson(req, messageSendLimiter, schema);
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return g.ctx.json({ ok: false, code: "not_found", message: "Conversation not found." }, 404);
  const day = await messageDailyLimiter.check(g.user.id);
  if (!day.ok) return g.ctx.json({ ok: false, code: "rate_limited", message: "Daily message limit reached. Try again tomorrow." }, 429, { "retry-after": String(day.retryAfterSec) });
  try {
    const r = await replyInConversation(toActor(g.user), id, g.body.body);
    if (!r.ok) return g.ctx.json({ ok: false, code: r.code, message: r.message }, r.code === "forbidden" ? 403 : r.code === "not_found" ? 404 : 422);
    log("info", "message_replied", { rid: g.ctx.rid, uid: g.user.id, cid: r.conversationId });
    return g.ctx.json({ ok: true, message: r.message, conversationId: r.conversationId }, 201);
  } catch (e) { return serverError(g.ctx, "message_reply_failed", e); }
}
