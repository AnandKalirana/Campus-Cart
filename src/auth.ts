import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validation/auth";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { authenticate } from "@/services/auth-service";

declare module "next-auth" {
  interface Session { user: { id: string; role: "STUDENT" | "ADMIN"; sv: number } & DefaultSession["user"] }
}

// 10 attempts / 15 min per (ip + email), and 30 / 15 min per ip. Per-instance: see rate-limit.ts.
const perAccount = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
const perIp = createRateLimiter({ limit: 30, windowMs: 15 * 60_000 });

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const ip = clientIp(request);
        if (!perIp.check(ip).ok || !perAccount.check(`${ip}:${parsed.data.email}`).ok) return null;
        const user = await authenticate(parsed.data.email, parsed.data.password);
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, sv: user.sessionVersion } as never;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: "STUDENT" | "ADMIN" }).role;
        token.sv = (user as { sv: number }).sv;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "STUDENT" | "ADMIN";
      session.user.sv = token.sv as number;
      return session;
    },
  },
});
