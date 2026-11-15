import { getCurrentUser } from "@/lib/session";
import { getMessages, sendMessage } from "@/services/messaging-service";
import type { Actor } from "@/services/listing-service";
import { z } from "zod";

const sendSchema = z.object({ body: z.string().min(1).max(2000) });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number(url.searchParams.get("limit")) || 50;

  try {
    const result = await getMessages(id, cursor, limit);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ ok: false, code: "not_found" }, { status: 404 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const json = await req.json();
  const parsed = sendSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, code: "invalid" }, { status: 400 });

  const actor: Actor = { id: user.id, name: user.name, role: user.role, emailVerified: user.emailVerified, universityId: user.universityId };
  const result = await sendMessage(actor, productId, parsed.data.body);

  if (!result.ok) {
    const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : 400;
    return Response.json({ ok: false, code: result.code, message: result.message }, { status });
  }

  return Response.json({ ok: true, message: result.message, conversationId: result.conversationId });
}