import "server-only";

export interface Mail { to: string; subject: string; text: string }

/**
 * Email delivery boundary. No provider is wired up yet (REQUIRES CONFIGURATION).
 * Development: prints the message, including its link, to the server console.
 * Production: refuses to run rather than silently dropping verification/reset emails.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Email delivery is not configured. Add an SMTP/API provider in src/services/mailer.ts.");
  }
  console.info(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
}
