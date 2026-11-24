/**
 * Sends ONE real test email through the configured provider, so you can prove delivery before launch.
 *   npm run mail:test -- you@example.com
 * Reads MAIL_DRIVER, MAIL_FROM and the provider key from the environment or .env.local. Prints which settings are
 * present (never the key itself). Refuses to run with the `log` driver, because that would prove nothing.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MailError, parseFrom, sendMail } from "../src/services/mailer";

async function main() {
  const to = process.argv[2]?.trim();
  if (!to) { console.error("Usage: npm run mail:test -- you@example.com"); process.exit(1); }
  const driver = process.env.MAIL_DRIVER ?? "log";
  const keyName = driver === "resend" ? "RESEND_API_KEY" : driver === "brevo" ? "BREVO_API_KEY" : null;
  console.log(`MAIL_DRIVER : ${driver}`);
  console.log(`MAIL_FROM   : ${process.env.MAIL_FROM ?? "(not set)"}`);
  console.log(`${(keyName ?? "provider key").padEnd(12)}: ${keyName ? (process.env[keyName] ? "set" : "NOT SET") : "n/a"}`);
  if (!keyName) { console.error("\nMAIL_DRIVER must be `brevo` or `resend` for a real test (the `log` driver only prints to the console)."); process.exit(1); }
  try { parseFrom(process.env.MAIL_FROM); } catch (e) { console.error(`\n${(e as Error).message}. Expected: Campus Cart <you@example.com>`); process.exit(1); }

  try {
    await sendMail({
      to,
      subject: "Campus Cart test email",
      text: `This is a test email from Campus Cart, sent at ${new Date().toISOString()}.\n\nIf you can read this, email delivery works. Check that it did not land in spam.`,
    });
  } catch (e) {
    const msg = e instanceof MailError ? e.message : "unexpected error";
    console.error(`\nSend FAILED: ${msg}`);
    if (/401|403/.test(msg)) console.error("Hint: the API key is wrong or the sender address is not verified at the provider.");
    if (/400/.test(msg)) console.error("Hint: the provider rejected the request. Usually MAIL_FROM is not a verified sender.");
    process.exit(1);
  }
  console.log(`\nThe provider accepted the message for ${to}. Now check that inbox (and spam). Accepted is not the same as delivered.`);
}
main();
