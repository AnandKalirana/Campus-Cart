import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { accountDeleteLimiter } from "@/lib/request-guards";
import { deleteAccount } from "@/services/account-service";
import { log } from "@/lib/log";

// POST /api/account/delete { password, confirm: "DELETE" } — permanent. 5 / 15 min / user.
// Auth: session + the account password (re-checked server-side). The target is always the session user.
const schema = z.object({ password: z.string().min(1).max(128), confirm: z.literal("DELETE") }).strict();

export async function POST(req: Request) {
  const g = await guardJson(req, accountDeleteLimiter, schema);
  if (!g.ok) return g.res;
  try {
    const r = await deleteAccount(g.user.id, g.body.password);
    if (!r.ok) {
      if (r.code === "wrong_password") log("warn", "account_delete_bad_password", { rid: g.ctx.rid, uid: g.user.id });
      const status = r.code === "wrong_password" ? 403 : r.code === "not_found" ? 404 : 409;
      return g.ctx.json({ ok: false, code: r.code, message: r.message }, status);
    }
    try { const { signOut } = await import("@/auth"); await signOut({ redirect: false }); } catch { /* the session is dead anyway: its user no longer exists */ }
    return g.ctx.json({ ok: true });
  } catch (e) { return serverError(g.ctx, "account_delete_failed", e); }
}
