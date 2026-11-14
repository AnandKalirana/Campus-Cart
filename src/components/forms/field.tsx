import { useId } from "react";

export function Field({ label, name, type = "text", error, autoComplete, hint, defaultValue, required = true }: {
  label: string; name: string; type?: string; error?: string; autoComplete?: string; hint?: string; defaultValue?: string; required?: boolean;
}) {
  const id = useId();
  const msg = `${id}-msg`;
  return (
    <div>
      <label htmlFor={id} className="font-raw mb-2 block text-sm">
        {label}{!required && <span className="font-sans normal-case tracking-normal"> (optional)</span>}
      </label>
      <input id={id} name={name} type={type} required={required} autoComplete={autoComplete} defaultValue={defaultValue}
        aria-invalid={!!error} aria-describedby={error || hint ? msg : undefined} className="bru-input h-14" />
      {(error || hint) && <p id={msg} className={`mt-2 text-sm font-bold ${error ? "text-cc-red" : ""}`}>{error ? <>Error: {error}</> : hint}</p>}
    </div>
  );
}

export function FormMessage({ ok, message }: { ok?: boolean; message?: string }) {
  if (!message) return null;
  return (
    <p role={ok ? "status" : "alert"} className={`border-4 border-black px-4 py-3 text-base font-bold ${ok ? "bg-cc-green" : "bg-white text-cc-red"}`}>
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="bru-btn h-14 w-full bg-black text-xl text-white hover:!bg-cc-orange hover:!text-black">
      {pending ? "Please wait…" : children}
    </button>
  );
}
