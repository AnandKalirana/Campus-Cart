import "server-only";
import { isIP } from "node:net";
import { createLimiter } from "@/lib/rate-limit/shared-limiter";
import { verifyTurnstile, type CaptchaResult } from "@/lib/turnstile";
import { normalizeEmail } from "@/lib/auth/email-domain";
import { log } from "@/lib/log";

/**
 * Abuse policy for the unauthenticated entry points, in one place. Counters live in the shared store
 * (Postgres), so limits hold across every serverless instance.
 *
 * Order for login and signup: IP limit -> Turnstile -> account/email limit.
 *  - The IP counter goes first and counts every attempt, so a bot that never solves the challenge still burns its IP budget.
 *  - Failed challenges do NOT count against an account/email, so strangers cannot lock someone out or mail-bomb them without passing the challenge.
 *
 * Limits are env-configurable (positive integers, clamped); defaults below.
 */
function intEnv(name: string, def: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : def;
}
const MIN = 60_000, HOUR = 60 * MIN;

export const limiters = {
  loginIp: createLimiter({ scope: "login-ip", limit: intEnv("RL_LOGIN_IP", 30), windowMs: 15 * MIN }),
  /** Per ACCOUNT across all IPs, so a distributed guesser still shares one budget. Cleared by a successful login. */
  loginAccount: createLimiter({ scope: "login-acct", limit: intEnv("RL_LOGIN_ACCOUNT", 10), windowMs: 15 * MIN }),
  signupIp: createLimiter({ scope: "signup-ip", limit: intEnv("RL_SIGNUP_IP", 5), windowMs: HOUR }),
  /** Caps verification emails to one address (mail-bombing) whether or not the account exists. */
  signupEmail: createLimiter({ scope: "signup-email", limit: intEnv("RL_SIGNUP_EMAIL", 3), windowMs: HOUR }),
  forgotIp: createLimiter({ scope: "forgot-ip", limit: intEnv("RL_FORGOT_IP", 5), windowMs: HOUR }),
  forgotEmail: createLimiter({ scope: "forgot-email", limit: intEnv("RL_FORGOT_EMAIL", 3), windowMs: HOUR }),
  resetIp: createLimiter({ scope: "reset-ip", limit: intEnv("RL_RESET_IP", 10), windowMs: HOUR }),
  verifyIp: createLimiter({ scope: "verify-ip", limit: intEnv("RL_VERIFY_IP", 20), windowMs: HOUR }),
};

/**
 * Client IP. Vercel sets `x-vercel-forwarded-for` / overwrites `x-forwarded-for` with the real client address;
 * the client cannot choose it there. ASSUMPTION: deployed on Vercel. Behind any other proxy, make sure it strips
 * client-supplied forwarding headers, or these limits can be dodged by spoofing them.
 */
export function clientIpFrom(h: { get(name: string): string | null }): string {
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "";
  const ip = raw.trim();
  return isIP(ip) ? ip : "unknown";
}

export type GuardResult = { ok: true } | { ok: false; reason: "rate_limited" | "captcha"; retryAfterSec: number };
type Verify = (token: string | undefined | null, ip: string | undefined) => Promise<CaptchaResult>;
interface Input { ip: string; email: string; token?: string | null; verify?: Verify }

const limited = (retryAfterSec: number): GuardResult => ({ ok: false, reason: "rate_limited", retryAfterSec });

export async function guardLogin({ ip, email, token, verify = verifyTurnstile }: Input): Promise<GuardResult> {
  const byIp = await limiters.loginIp.check(ip);
  if (!byIp.ok) { log("warn", "login_rate_limited", { by: "ip" }); return limited(byIp.retryAfterSec); }
  const captcha = await verify(token, ip);
  if (!captcha.ok) { log("warn", "login_captcha_failed", { reason: captcha.reason }); return { ok: false, reason: "captcha", retryAfterSec: 0 }; }
  const acct = await limiters.loginAccount.check(normalizeEmail(email));
  if (!acct.ok) { log("warn", "login_rate_limited", { by: "account" }); return limited(acct.retryAfterSec); }
  return { ok: true };
}

/** A correct password clears that account's counter, so normal users are never locked out by their own typos. */
export async function loginSucceeded(email: string): Promise<void> {
  await limiters.loginAccount.reset(normalizeEmail(email));
}

export async function guardSignup({ ip, email, token, verify = verifyTurnstile }: Input): Promise<GuardResult> {
  const byIp = await limiters.signupIp.check(ip);
  if (!byIp.ok) { log("warn", "signup_rate_limited", { by: "ip" }); return limited(byIp.retryAfterSec); }
  const captcha = await verify(token, ip);
  if (!captcha.ok) { log("warn", "signup_captcha_failed", { reason: captcha.reason }); return { ok: false, reason: "captcha", retryAfterSec: 0 }; }
  const byEmail = await limiters.signupEmail.check(normalizeEmail(email));
  if (!byEmail.ok) { log("warn", "signup_rate_limited", { by: "email" }); return limited(byEmail.retryAfterSec); }
  return { ok: true };
}

/** Forgot-password: IP + per-address caps (stops mail-bombing a victim through the reset form). */
export async function guardForgot({ ip, email }: { ip: string; email: string }): Promise<GuardResult> {
  const byIp = await limiters.forgotIp.check(ip);
  if (!byIp.ok) return limited(byIp.retryAfterSec);
  const byEmail = await limiters.forgotEmail.check(normalizeEmail(email));
  return byEmail.ok ? { ok: true } : limited(byEmail.retryAfterSec);
}
