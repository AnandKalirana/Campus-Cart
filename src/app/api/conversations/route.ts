import { getCurrentUser } from "@/lib/session";
import { getConversations } from "@/services/messaging-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  try {
    const conversations = await getConversations();
    return Response.json({ ok: true, conversations });
  } catch {
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}