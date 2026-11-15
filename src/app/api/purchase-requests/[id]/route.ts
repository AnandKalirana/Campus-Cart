import { getCurrentUser } from "@/lib/session";
import { getPurchaseRequest, updatePurchaseRequestStatus } from "@/services/purchase-request-service";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const request = await getPurchaseRequest(id);
    if (!request) {
      return Response.json({ ok: false, code: "not_found" }, { status: 404 });
    }
    return Response.json({ ok: true, request });
  } catch {
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, code: "invalid" }, { status: 400 });

  const result = await updatePurchaseRequestStatus(id, parsed.data.status);

  if (!result.ok) {
    const status = result.code === "forbidden" ? 403 : result.code === "not_found" ? 404 : result.code === "conflict" ? 409 : 400;
    return Response.json({ ok: false, code: result.code, message: result.message }, { status });
  }

  return Response.json({ ok: true, request: result.request });
}