import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { emailMatchesDomains, normalizeEmail } from "@/lib/auth/email-domain";
import { sendMail } from "@/services/mailer";
import type { RegisterInput } from "@/lib/validation/auth";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export type RegisterResult =
  | { ok: true }
  | { ok: false; field: "universityId" | "email"; message: string };

async function issueToken(userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET", ttlMs: number): Promise<string> {
  const token = generateToken();
  await db().$transaction([
    // One live token per purpose: issuing a new one invalidates older unused ones.
    db().authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db().authToken.create({ data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) } }),
  ]);
  return token;
}

/**
 * Role, status and verification are never taken from input: new accounts are always STUDENT/ACTIVE/unverified.
 * Responds identically whether or not the email already has an account (no account enumeration).
 */
export async function registerStudent(input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const university = await db().university.findFirst({ where: { id: input.universityId, isActive: true } });
  if (!university) return { ok: false, field: "universityId", message: "Choose a campus from the list." };
  if (university.emailDomains.length === 0) {
    return { ok: false, field: "universityId", message: "This campus isn't accepting sign-ups yet." };
  }
  if (!emailMatchesDomains(email, university.emailDomains)) {
    return { ok: false, field: "email", message: "Use your college email address for this campus." };
  }

  const existing = await db().user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: true };

  const passwordHash = await hashPassword(input.password);
  let userId: string;
  try {
    userId = (await db().user.create({ data: { email, name: input.name, passwordHash, universityId: university.id }, select: { id: true } })).id;
  } catch (e) {
    // Lost a race with a concurrent signup for the same email: unique constraint (P2002).
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") return { ok: true };
    throw e;
  }
  const token = await issueToken(userId, "EMAIL_VERIFY", VERIFY_TTL_MS);
  await sendMail({
    to: email,
    subject: "Verify your Campus Cart email",
    text: `Welcome to Campus Cart.\n\nVerify your email: ${env().APP_URL}/verify-email?token=${token}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
  });
  return { ok: true };
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const row = await db().authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== "EMAIL_VERIFY" || row.usedAt || row.expiresAt < new Date()) return false;
  await db().$transaction([
    db().authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db().user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
  ]);
  return true;
}

export interface SessionUser { id: string; email: string; name: string; role: "STUDENT" | "ADMIN"; sessionVersion: number }

/** Returns the user only for correct credentials on an ACTIVE account. Constant-ish time for unknown emails. */
export async function authenticate(emailRaw: string, password: string): Promise<SessionUser | null> {
  const user = await db().user.findUnique({ where: { email: normalizeEmail(emailRaw) } });
  if (!user?.passwordHash) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  if (user.status !== "ACTIVE") return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
}

/** Always resolves the same way so callers cannot learn which emails are registered. */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const user = await db().user.findUnique({ where: { email }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(user.id, "PASSWORD_RESET", RESET_TTL_MS);
  await sendMail({
    to: email,
    subject: "Reset your Campus Cart password",
    text: `Reset your password: ${env().APP_URL}/reset-password?token=${token}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.`,
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const row = await db().authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.type !== "PASSWORD_RESET" || row.usedAt || row.expiresAt < new Date()) return false;
  const passwordHash = await hashPassword(newPassword);
  await db().$transaction([
    db().authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Bumping sessionVersion signs the user out everywhere.
    db().user.update({ where: { id: row.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
  ]);
  return true;
}
