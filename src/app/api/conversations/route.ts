import { guardRead, serverError } from "@/lib/api-route";
import { inboxReadLimiter } from "@/lib/request-guards";
import { getConversations } from "@/services/messaging-service";

// GET /api/conversations — the caller's own threads only (the service filters by session user). 401, 429, 500.
export async function GET(req: Request) {
  const g = await guardRead(req, inboxReadLimiter);
  if (!g.ok) return g.res;
  try { return g.ctx.json({ ok: true, conversations: await getConversations() }); }
  catch (e) { return serverError(g.ctx, "conversations_failed", e); }
}
