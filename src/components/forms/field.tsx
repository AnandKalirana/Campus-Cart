import { useId } from "react";

export function Field({ label, name, type = "text", error, autoComplete, hint, defaultValue, required = true }: {
  label: string; name: string; type?: string; error?: string; autoComplete?: string; hint?: string; defaultValue?: string; required?: boolean;
}) {
  const id = useId();
  const msg = `${id}-msg`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">
        {label}{!required && <span className="font-normal text-cc-muted"> (optional)</span>}
      </label>
      <input id={id} name={name} type={type} required={required} autoComplete={autoComplete} defaultValue={defaultValue}
        aria-invalid={!!error} aria-describedby={error || hint ? msg : undefined}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(10,96,232,0.15)] ${error ? "border-red-600" : "border-cc-line focus:border-cc-blue"}`} />
      {(error || hint) && <p id={msg} className={`mt-1.5 text-xs ${error ? "text-red-700" : "text-cc-muted"}`}>{error ?? hint}</p>}
    </div>
  );
}

export function FormMessage({ ok, message }: { ok?: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p role={ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm ${ok ? "bg-cc-surface-blue text-cc-ink" : "bg-red-50 text-red-800"}`}>
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending}
      className="h-12 w-full rounded-full bg-cc-ink text-[15px] font-medium text-white transition-[transform,opacity] duration-150 hover:bg-black active:scale-[0.98] disabled:opacity-60">
      {pending ? "Please wait…" : children}
    </button>
  );
}
