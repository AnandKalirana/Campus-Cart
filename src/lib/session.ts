import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export interface CurrentUser { id: string; email: string; name: string; role: "STUDENT" | "ADMIN"; emailVerified: boolean; universityId: string | null }

/**
 * The authoritative check. The JWT only says who the browser claims to be; this reloads the user
 * and rejects suspended accounts and sessions issued before a password reset (sessionVersion).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection(); // per-request only: Auth.js uses crypto, which must not run during prerender
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db().user.findUnique({ where: { id } });
  if (!user || user.status !== "ACTIVE") return null;
  if (session.user.sv !== user.sessionVersion) return null; // issued before a password reset
  return { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.emailVerified, universityId: user.universityId };
});

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
