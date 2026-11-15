import { getCurrentUser } from "@/lib/session";
import { createPurchaseRequest, getPurchaseRequests } from "@/services/purchase-request-service";
import type { Actor } from "@/services/listing-service";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  try {
    const [buyerRequests, sellerRequests] = await Promise.all([
      getPurchaseRequests("buyer"),
      getPurchaseRequests("seller"),
    ]);
    return Response.json({ ok: true, buyerRequests, sellerRequests });
  } catch {
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, code: "invalid" }, { status: 400 });

  const actor: Actor = { id: user.id, name: user.name, role: user.role, emailVerified: user.emailVerified, universityId: user.universityId };
  const result = await createPurchaseRequest(actor, parsed.data.productId, parsed.data.note);

  if (!result.ok) {
    const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : result.code === "conflict" ? 409 : 400;
    return Response.json({ ok: false, code: result.code, message: result.message }, { status });
  }

  return Response.json({ ok: true, request: result.request });
}