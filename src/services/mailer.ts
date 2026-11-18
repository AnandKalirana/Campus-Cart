import "server-only";
import { z } from "zod";
import { log } from "@/lib/log";

export interface Mail { to: string; subject: string; text: string }

/**
 * Email delivery boundary. Providers are called over HTTPS with `fetch` (no extra dependency).
 *
 *   MAIL_DRIVER = log | resend | brevo        (default: log)
 *   MAIL_FROM   = "Campus Cart <no-reply@your-domain>"   (required for resend/brevo; sender must be verified at the provider)
 *   RESEND_API_KEY / BREVO_API_KEY            (server-side only, never NEXT_PUBLIC_)
 *
 * `log` prints the message, including its link, to the server console. It is for development and tests only:
 * in production it refuses to run instead of silently dropping verification and reset emails.
 */
const configSchema = z.object({
  MAIL_DRIVER: z.enum(["log", "resend", "brevo"]).default("log"),
  MAIL_FROM: z.string().max(200).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});
export type MailConfig = z.infer<typeof configSchema>;

const EMAIL = /^[^\s<>"',;()@]+@[^\s<>"',;()@]+\.[^\s<>"',;()@]+$/;
const FROM = /^(?:([^<>\r\n]{1,100})\s)?<?([^\s<>"',;()@]+@[^\s<>"',;()@]+\.[^\s<>"',;()@]+)>?$/;
const TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 300;
const MAX_BODY = 20_000;

export class MailError extends Error {
  constructor(message: string, readonly retryable = false) { super(message); this.name = "MailError"; }
}

export function parseFrom(raw: string | undefined): { name?: string; email: string } {
  const m = raw ? FROM.exec(raw.trim()) : null;
  if (!m) throw new MailError("MAIL_FROM is missing or not a valid address");
  return { name: m[1]?.trim() || undefined, email: m[2] };
}

/** Rejects anything that could inject headers or recipients, and oversized bodies. Never trusts the caller. */
export function assertSafeMail(mail: Mail): void {
  if (!EMAIL.test(mail.to) || mail.to.length > 254) throw new MailError("Invalid recipient address");
  if (/[\r\n]/.test(mail.subject) || mail.subject.length === 0 || mail.subject.length > 200) throw new MailError("Invalid subject");
  if (mail.text.length === 0 || mail.text.length > MAX_BODY) throw new MailError("Invalid body length");
}

export interface HttpRequest { url: string; headers: Record<string, string>; body: string }

/** Pure: builds the provider request. Exported for tests. */
export function buildRequest(cfg: MailConfig, mail: Mail): HttpRequest {
  const from = parseFrom(cfg.MAIL_FROM);
  if (cfg.MAIL_DRIVER === "resend") {
    if (!cfg.RESEND_API_KEY) throw new MailError("RESEND_API_KEY is not set");
    return {
      url: "https://api.resend.com/emails",
      headers: { authorization: `Bearer ${cfg.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: from.name ? `${from.name} <${from.email}>` : from.email, to: [mail.to], subject: mail.subject, text: mail.text }),
    };
  }
  if (cfg.MAIL_DRIVER === "brevo") {
    if (!cfg.BREVO_API_KEY) throw new MailError("BREVO_API_KEY is not set");
    return {
      url: "https://api.brevo.com/v3/smtp/email",
      headers: { "api-key": cfg.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: from.name ?? "Campus Cart", email: from.email }, to: [{ email: mail.to }], subject: mail.subject, textContent: mail.text }),
    };
  }
  throw new MailError("No HTTP provider for this driver");
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number }>;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function once(fetchFn: FetchLike, req: HttpRequest): Promise<void> {
  let status: number;
  try {
    ({ status } = await fetchFn(req.url, { method: "POST", headers: req.headers, body: req.body, signal: AbortSignal.timeout(TIMEOUT_MS) }));
  } catch {
    throw new MailError("Mail provider unreachable or timed out", true); // no cause attached: it can echo request details
  }
  if (status >= 200 && status < 300) return;
  // Status only: provider response bodies can contain the recipient address.
  throw new MailError(`Mail provider responded ${status}`, status === 429 || status >= 500);
}

export function createMailer(cfg: MailConfig, fetchFn: FetchLike = fetch as unknown as FetchLike, delay: (ms: number) => Promise<void> = sleep) {
  return async function send(mail: Mail): Promise<void> {
    assertSafeMail(mail);
    if (cfg.MAIL_DRIVER === "log") {
      if (cfg.NODE_ENV === "production") throw new MailError("Email delivery is not configured: set MAIL_DRIVER, MAIL_FROM and the provider API key");
      console.info(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
      return;
    }
    const req = buildRequest(cfg, mail);
    const started = Date.now();
    try { await once(fetchFn, req); }
    catch (e) {
      if (!(e instanceof MailError) || !e.retryable) throw e;
      await delay(RETRY_DELAY_MS); // one retry only: never loop on a failing provider
      await once(fetchFn, req);
    }
    log("info", "mail_sent", { driver: cfg.MAIL_DRIVER, ms: Date.now() - started });
  };
}

/** Throws MailError on failure (never includes keys or addresses in the message). */
export async function sendMail(mail: Mail): Promise<void> {
  await createMailer(configSchema.parse(process.env))(mail); // parsed per send: cheap, and config changes never go stale
}

/** For flows that must answer identically whether or not mail could be sent (signup, password reset). Logs, never throws. */
export async function trySendMail(mail: Mail, event: string): Promise<boolean> {
  try { await sendMail(mail); return true; }
  catch (e) { log("error", "mail_failed", { flow: event, reason: e instanceof MailError ? e.message : "unexpected_error" }); return false; }
}
