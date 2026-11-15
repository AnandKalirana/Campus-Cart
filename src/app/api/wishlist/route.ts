import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({ productId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ ok: false, code: "invalid" }, { status: 400 });

  try {
    const existing = await db().wishlist.findUnique({
      where: { userId_productId: { userId: user.id, productId: parsed.data.productId } },
    });

    if (existing) {
      await db().wishlist.delete({ where: { userId_productId: { userId: user.id, productId: parsed.data.productId } } });
      return Response.json({ ok: true, saved: false });
    }

    await db().wishlist.create({
      data: { userId: user.id, productId: parsed.data.productId },
    });
    return Response.json({ ok: true, saved: true });
  } catch {
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}