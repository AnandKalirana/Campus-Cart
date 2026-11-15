import { getCurrentUser } from "@/lib/session";
import { markMessagesRead } from "@/services/messaging-service";
import { z } from "zod";

const bodySchema = z.object({ messageId: z.string().optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, code: "invalid" }, { status: 400 });

  try {
    await markMessagesRead(id, parsed.data.messageId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, code: "not_found" }, { status: 404 });
  }
}