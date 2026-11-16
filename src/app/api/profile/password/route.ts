import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { passwordChangeLimiter } from "@/lib/request-guards";
import { passwordSchema } from "@/lib/validation/auth";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { log } from "@/lib/log";

// PATCH /api/profile/password { currentPassword, newPassword } — 5 / 15 min / user (guards against a stolen session guessing the password).
// New password follows the same rule as signup and reset (10–128 chars). Bumps sessionVersion, which signs out every other session.
const schema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });

export async function PATCH(req: Request) {
  const g = await guardJson(req, passwordChangeLimiter, schema);
  if (!g.ok) return g.res;
  const { currentPassword, newPassword } = g.body;
  try {
    const row = await db().user.findUnique({ where: { id: g.user.id }, select: { passwordHash: true } });
    if (!row?.passwordHash) return g.ctx.json({ ok: false, code: "no_password", message: "This account has no password to change." }, 400);
    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
      log("warn", "password_change_bad_current", { rid: g.ctx.rid, uid: g.user.id });
      return g.ctx.json({ ok: false, code: "wrong_password", message: "Current password is incorrect." }, 403);
    }
    if (currentPassword === newPassword) return g.ctx.json({ ok: false, code: "unchanged", message: "New password must be different." }, 400);
    if (newPassword.toLowerCase() === g.user.email.toLowerCase()) return g.ctx.json({ ok: false, code: "invalid", message: "Password can't be your email." }, 422);
    await db().user.update({ where: { id: g.user.id }, data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } } });
    log("info", "password_changed", { rid: g.ctx.rid, uid: g.user.id });
    return g.ctx.json({ ok: true });
  } catch (e) { return serverError(g.ctx, "password_change_failed", e); }
}
