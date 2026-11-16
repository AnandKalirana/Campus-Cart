import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { profileNameLimiter } from "@/lib/request-guards";
import { db } from "@/lib/db";

// PATCH /api/profile/name { name } — changes the caller's own display name. 10 / hour / user.
const schema = z.object({ name: z.string().trim().min(2, "Enter your name.").max(80, "Keep it under 80 characters.").regex(/^[^\p{C}]+$/u, "Name has invalid characters.") });

export async function PATCH(req: Request) {
  const g = await guardJson(req, profileNameLimiter, schema);
  if (!g.ok) return g.res;
  if (g.body.name === g.user.name) return g.ctx.json({ ok: false, code: "unchanged", message: "That's already your name." }, 400);
  try {
    await db().user.update({ where: { id: g.user.id }, data: { name: g.body.name } });
    return g.ctx.json({ ok: true });
  } catch (e) { return serverError(g.ctx, "profile_name_failed", e); }
}
