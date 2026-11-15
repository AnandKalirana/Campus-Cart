import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const bodySchema = z.object({ name: z.string().min(2).max(80) });

export async function PATCH(req: Request) {
  const user = await requireUser("/profile");
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ message: "Invalid name" }, { status: 400 });

  const name = parsed.data.name.trim();
  if (name === user.name) return Response.json({ message: "That's already your name" }, { status: 400 });

  await db().user.update({ where: { id: user.id }, data: { name } });
  return Response.json({ ok: true });
}