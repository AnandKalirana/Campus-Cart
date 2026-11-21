import NextAuth, { CredentialsSignin, type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validation/auth";
import { clientIpFrom, guardLogin, loginSucceeded } from "@/lib/auth/abuse-guard";
import { authenticate } from "@/services/auth-service";

declare module "next-auth" {
  interface Session { user: { id: string; role: "STUDENT" | "ADMIN"; sv: number } & DefaultSession["user"] }
}

/** Distinct codes let the login action show the right message without revealing anything about the account. */
export class RateLimitedSignin extends CredentialsSignin { code = "rate_limited"; }
export class CaptchaSignin extends CredentialsSignin { code = "captcha_failed"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, turnstile: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        // Enforced HERE, not only in the form action: Auth.js also exposes /api/auth/callback/credentials, which a bot could
        // call directly. Whatever the entry point, the IP limit, Turnstile and the per-account limit all run before any password check.
        const token = typeof raw?.turnstile === "string" ? raw.turnstile : undefined;
        const guard = await guardLogin({ ip: clientIpFrom(request.headers), email: parsed.data.email, token });
        if (!guard.ok) throw guard.reason === "captcha" ? new CaptchaSignin() : new RateLimitedSignin();
        const user = await authenticate(parsed.data.email, parsed.data.password);
        if (!user) return null;
        await loginSucceeded(parsed.data.email);
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
