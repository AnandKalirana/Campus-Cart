"use client";
import Link from "next/link";
import { useActionState } from "react";
import { verifyEmailAction } from "../actions";
import type { FormState } from "@/lib/auth/actions-helpers";
import { FormMessage, SubmitButton } from "@/components/forms/field";

export function VerifyButton({ token }: { token: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(verifyEmailAction, {});
  if (s.ok) return (<div className="space-y-4"><FormMessage ok message={s.message} /><Link href="/login" className="block text-center text-sm font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Log in</Link></div>);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={s.message} />
      <p className="text-base font-bold">Confirm that this is your college email address.</p>
      <SubmitButton pending={pending}>Verify my email</SubmitButton>
    </form>
  );
}
