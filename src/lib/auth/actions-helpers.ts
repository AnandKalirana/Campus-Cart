import { headers } from "next/headers";
import { clientIpFrom } from "@/lib/auth/abuse-guard";

// `values` echoes non-secret fields back so React 19's post-action form reset doesn't wipe what the user typed. Never put passwords here.
export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

export async function ipFromHeaders(): Promise<string> {
  return clientIpFrom(await headers());
}

export const TOO_MANY: FormState = { message: "Too many attempts. Please wait a bit and try again." };
export const CAPTCHA_FAILED: FormState = { message: "We couldn't confirm you're a person. Please complete the security check and try again." };
export const tooManyIn = (sec: number): FormState => ({ message: `Too many attempts. Please try again in ${sec >= 120 ? `${Math.ceil(sec / 60)} minutes` : sec > 60 ? "a couple of minutes" : "a minute"}.` });
export const GENERIC_ERROR: FormState = { message: "We couldn't complete your request. Please try again." };

export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}
