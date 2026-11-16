import { z } from "zod";
import { guardJson, serverError } from "@/lib/api-route";
import { resendVerificationLimiter } from "@/lib/request-guards";
import { resendVerificationEmail } from "@/services/auth-service";

// POST /api/auth/resend-verification — sends a fresh link to the caller's own address. 3 / hour / user.
export async function POST(req: Request) {
  const g = await guardJson(req, resendVerificationLimiter, z.object({}).strict().default({}));
  if (!g.ok) return g.res;
  if (g.user.emailVerified) return g.ctx.json({ ok: false, code: "already_verified", message: "Email already verified." }, 409);
  try { await resendVerificationEmail(g.user.id); return g.ctx.json({ ok: true }); }
  catch (e) { return serverError(g.ctx, "resend_verification_failed", e); }
}
