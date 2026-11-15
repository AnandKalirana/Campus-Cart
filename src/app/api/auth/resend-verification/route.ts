import { requireUser } from "@/lib/session";
import { resendVerificationEmail } from "@/services/auth-service";

export async function POST() {
  const user = await requireUser("/profile");
  if (user.emailVerified) return Response.json({ message: "Email already verified" }, { status: 400 });
  await resendVerificationEmail(user.id);
  return Response.json({ ok: true });
}