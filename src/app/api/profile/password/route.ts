import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import { verifyPassword, hashPassword } from "@/lib/auth/password";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(req: Request) {
  const user = await requireUser("/profile");
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ message: "Invalid input" }, { status: 400 });

  const { currentPassword, newPassword } = parsed.data;

  const dbUser = await db().user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser?.passwordHash) return Response.json({ message: "OAuth accounts cannot change password here" }, { status: 400 });

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) return Response.json({ message: "Current password is incorrect" }, { status: 401 });

  if (currentPassword === newPassword) return Response.json({ message: "New password must be different" }, { status: 400 });

  const newHash = await hashPassword(newPassword);
  await db().user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, sessionVersion: { increment: 1 } },
  });

  return Response.json({ ok: true });
}