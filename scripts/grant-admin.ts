/**
 * Grants or revokes the ADMIN role. There is deliberately no web UI for this: the first admin is created by someone with database access.
 *   DATABASE_URL=... npx tsx scripts/grant-admin.ts grant person@campus.edu
 *   DATABASE_URL=... npx tsx scripts/grant-admin.ts revoke person@campus.edu
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [mode, emailRaw] = process.argv.slice(2);
  if ((mode !== "grant" && mode !== "revoke") || !emailRaw) { console.error("Usage: grant-admin.ts <grant|revoke> <email>"); process.exit(1); }
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL is required."); process.exit(1); }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const email = emailRaw.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true, emailVerified: true } });
  if (!user) { console.error("No user with that email."); process.exit(1); }
  if (mode === "grant" && !user.emailVerified) { console.error("Refusing: that account's email is not verified."); process.exit(1); }
  await db.$transaction([
    // sessionVersion bump forces a fresh login so the role change takes effect cleanly.
    db.user.update({ where: { id: user.id }, data: { role: mode === "grant" ? "ADMIN" : "STUDENT", sessionVersion: { increment: 1 } } }),
    db.auditLog.create({ data: { actorId: null, action: `admin.${mode}`, targetType: "user", targetId: user.id, detail: "via grant-admin script" } }),
  ]);
  console.log(`${mode === "grant" ? "Granted" : "Revoked"} admin for ${email}. They must log in again.`);
  await db.$disconnect();
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
