"use client";

import { useActionState } from "react";
import type { AdminState } from "@/app/admin/actions";

type Action = (prev: AdminState, fd: FormData) => Promise<AdminState>;

/** One moderation decision with a required, logged reason. All validation and authorization happens in the server action. */
export function AdminForm({ action, fields, label, submit, tone = "neutral", needsReason = true }: {
  action: Action; fields: Record<string, string>; label: string; submit: string; tone?: "danger" | "neutral"; needsReason?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const id = `f-${Object.values(fields).join("-")}`;
  return (
    <form action={run} className="flex flex-wrap items-end gap-2">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {needsReason && (
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={id} className="mb-1 block text-xs font-bold">{label}</label>
          <input id={id} name="reason" required minLength={5} maxLength={300} autoComplete="off" className="bru-input h-10 w-full text-sm" />
        </div>
      )}
      <button type="submit" disabled={pending} className={`bru-btn h-10 px-4 text-sm ${tone === "danger" ? "bg-black text-white" : "bg-white"}`}>{pending ? "Working…" : submit}</button>
      {state?.message && <p role={state.ok ? "status" : "alert"} className={`w-full border-2 border-black p-2 text-xs font-bold ${state.ok ? "bg-cc-green" : "bg-cc-pink"}`}>{state.message}</p>}
    </form>
  );
}
