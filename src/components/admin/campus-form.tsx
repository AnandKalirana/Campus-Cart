"use client";

import { useActionState } from "react";
import { saveCampusAction, type AdminState } from "@/app/admin/actions";

export function CampusForm({ campus }: { campus?: { id: string; name: string; city: string | null; emailDomains: string[]; isActive: boolean } }) {
  const [state, run, pending] = useActionState<AdminState, FormData>(saveCampusAction, undefined);
  const p = campus?.id ?? "new";
  const v = state?.values; // present only after a failed save
  return (
    <form action={run} className="grid gap-3 md:grid-cols-2" noValidate>
      {campus && <input type="hidden" name="id" value={campus.id} />}
      <div>
        <label htmlFor={`n-${p}`} className="mb-1 block text-sm font-bold">Campus name</label>
        <input id={`n-${p}`} name="name" required maxLength={80} defaultValue={v?.name ?? campus?.name} className="bru-input h-11 w-full" aria-invalid={!!state?.errors?.name} />
      </div>
      <div>
        <label htmlFor={`c-${p}`} className="mb-1 block text-sm font-bold">City <span className="font-normal">(optional)</span></label>
        <input id={`c-${p}`} name="city" maxLength={60} defaultValue={v?.city ?? campus?.city ?? ""} className="bru-input h-11 w-full" />
      </div>
      <div className="md:col-span-2">
        <label htmlFor={`d-${p}`} className="mb-1 block text-sm font-bold">Student email domains</label>
        <textarea id={`d-${p}`} name="domains" rows={2} defaultValue={v?.domains ?? campus?.emailDomains.join("\n")} aria-describedby={`dh-${p}`} className="bru-input w-full resize-none" />
        <p id={`dh-${p}`} className="mt-1 text-xs font-bold">One per line, e.g. tcetmumbai.in. Subdomains match too. Public providers (gmail.com) and shared suffixes (ac.in) are rejected.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="isActive" defaultChecked={v ? v.isActive === "on" : campus?.isActive ?? true} className="h-5 w-5" /> Active (students can register)</label>
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className="bru-btn h-11 bg-black px-6 text-sm text-white">{pending ? "Saving…" : campus ? "Save campus" : "Add campus"}</button>
        {state?.message && <p role={state.ok ? "status" : "alert"} className={`mt-3 border-2 border-black p-2 text-sm font-bold ${state.ok ? "bg-cc-green" : "bg-cc-pink"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
