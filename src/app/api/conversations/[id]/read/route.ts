import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { inboxReadLimiter } from "@/lib/request-guards";
import { idSchema } from "@/lib/validation/listing";
import { markMessagesRead } from "@/services/messaging-service";

// POST /api/conversations/:conversationId/read { messageId? } — marks the OTHER party's messages read. Participants only.
const schema = z.object({ messageId: idSchema.optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardJson(req, inboxReadLimiter, schema);
  if (!g.ok) return g.res;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return g.ctx.json({ ok: false, code: "not_found", message: "Not found." }, 404);
  try { await markMessagesRead(id, g.body.messageId); return g.ctx.json({ ok: true }); }
  catch (e) { return serverError(g.ctx, "mark_read_failed", e); }
}
