"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/(auth)/actions";
import type { FormState } from "@/lib/auth/actions-helpers";
import { Field, FormMessage, SubmitButton } from "./field";

const init: FormState = {};

export function LoginForm({ next }: { next: string }) {
  const [s, action, pending] = useActionState(loginAction, init);
  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <input type="hidden" name="next" value={next} />
      <FormMessage message={s.message} />
      <Field label="College email" name="email" type="email" autoComplete="email" defaultValue={s.values?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <p className="text-center text-sm"><Link href="/forgot-password" className="font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Forgot your password?</Link></p>
    </form>
  );
}

export function RegisterForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState(registerAction, init);
  const e = s.errors ?? {};
  if (s.ok) return <FormMessage ok message={s.message} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage message={s.message} />
      <Field label="Full name" name="name" autoComplete="name" error={e.name} defaultValue={s.values?.name} />
      <div>
        <label htmlFor="universityId" className="font-raw mb-2 block text-sm">Campus</label>
        <select key={s.values?.universityId ?? "unset"} id="universityId" name="universityId" required defaultValue={s.values?.universityId ?? ""} aria-invalid={!!e.universityId} aria-describedby={e.universityId ? "uni-err" : undefined}
          className="bru-input h-14">
          <option value="" disabled>Choose your campus</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {e.universityId && <p id="uni-err" className="mt-2 text-sm font-bold text-cc-red">Error: {e.universityId}</p>}
      </div>
      <Field label="College email" name="email" type="email" autoComplete="email" error={e.email} defaultValue={s.values?.email} hint="Must match your campus's email domain." />
      <Field label="Password" name="password" type="password" autoComplete="new-password" error={e.password} hint="At least 10 characters." />
      <SubmitButton pending={pending}>Create account</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [s, action, pending] = useActionState(forgotPasswordAction, init);
  if (s.ok) return <FormMessage ok message={s.message} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage message={s.message} />
      <Field label="College email" name="email" type="email" autoComplete="email" error={s.errors?.email} defaultValue={s.values?.email} />
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [s, action, pending] = useActionState(resetPasswordAction, init);
  if (s.ok) return (<div className="space-y-4"><FormMessage ok message={s.message} /><Link href="/login" className="block text-center text-base font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Go to log in</Link></div>);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage message={s.message ?? s.errors?.token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" error={s.errors?.password} hint="At least 10 characters." />
      <SubmitButton pending={pending}>Update password</SubmitButton>
    </form>
  );
}
