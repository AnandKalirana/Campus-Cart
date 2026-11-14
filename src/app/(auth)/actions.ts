"use server";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { safeNextPath } from "@/lib/auth/safe-next";
import { FormState, GENERIC_ERROR, TOO_MANY, fieldErrors, forgotLimiter, ipFromHeaders, registerLimiter, resetLimiter, verifyLimiter } from "@/lib/auth/actions-helpers";
import { registerStudent, requestPasswordReset, resetPassword, verifyEmailToken } from "@/services/auth-service";
import { tokenSchema } from "@/lib/validation/auth";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  // Role, status and verification are deliberately NOT read from the form.
  const parsed = registerSchema.safeParse({ name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password"), universityId: str(fd, "universityId") });
  const values = { name: str(fd, "name"), email: str(fd, "email"), universityId: str(fd, "universityId") };
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values };
  if (!registerLimiter.check(await ipFromHeaders()).ok) return { ...TOO_MANY, values };
  try {
    const r = await registerStudent(parsed.data);
    if (!r.ok) return { errors: { [r.field]: r.message }, values };
    return { ok: true, message: "Check your college inbox for a verification link. Existing accounts get no new email, so if nothing arrives, try logging in." };
  } catch (e) {
    console.error("register failed", e instanceof Error ? e.message : "unknown");
    return { ...GENERIC_ERROR, values };
  }
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password") });
  const values = { email: str(fd, "email") };
  if (!parsed.success) return { message: "Enter your email and password.", values };
  const next = safeNextPath(str(fd, "next"));
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { message: "That email and password don't match, or the account can't sign in right now.", values };
    console.error("login failed", e instanceof Error ? e.message : "unknown");
    return { ...GENERIC_ERROR, values };
  }
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: str(fd, "email") });
  const values = { email: str(fd, "email") };
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values };
  if (!forgotLimiter.check(await ipFromHeaders()).ok) return { ...TOO_MANY, values };
  try { await requestPasswordReset(parsed.data.email); } catch (e) { console.error("reset request failed", e instanceof Error ? e.message : "unknown"); }
  // Same answer whether or not the account exists.
  return { ok: true, message: "If that email has an account, a reset link is on its way. It expires in 1 hour." };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ token: str(fd, "token"), password: str(fd, "password") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };
  if (!resetLimiter.check(await ipFromHeaders()).ok) return TOO_MANY;
  try {
    const ok = await resetPassword(parsed.data.token, parsed.data.password);
    if (!ok) return { message: "This reset link is invalid or has expired. Request a new one." };
    return { ok: true, message: "Password updated. You've been signed out everywhere. Log in with your new password." };
  } catch (e) {
    console.error("reset failed", e instanceof Error ? e.message : "unknown");
    return GENERIC_ERROR;
  }
}

export async function verifyEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = tokenSchema.safeParse({ token: str(fd, "token") });
  if (!parsed.success) return { message: "This verification link is invalid." };
  if (!verifyLimiter.check(await ipFromHeaders()).ok) return TOO_MANY;
  try {
    const ok = await verifyEmailToken(parsed.data.token);
    return ok ? { ok: true, message: "Email verified. You can now list items and message sellers." } : { message: "This verification link is invalid or has expired." };
  } catch (e) {
    console.error("verify failed", e instanceof Error ? e.message : "unknown");
    return GENERIC_ERROR;
  }
}
