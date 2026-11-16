"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";

/** Lets a signed-in student flag a listing for moderators. The server decides everything; this collects the reason. */
export function ReportButton({ productId, signedIn }: { productId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    area.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (reason.trim().length < 10) { setError("Tell us a bit more (at least 10 characters)."); return; }
    setState("sending"); setError(null);
    try {
      const res = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, reason }) });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) { setState("done"); return; }
      if (res.status === 409) { setState("done"); return; } // already reported: same outcome for the reader
      setError(res.status === 429 ? "You've sent a lot of reports today. Try again tomorrow." : data?.message ?? "Couldn't send your report. Please try again.");
      setState("idle");
    } catch { setError("Couldn't reach the server. Check your connection."); setState("idle"); }
  }

  if (!signedIn) return <p className="mt-6 text-sm font-bold">Something wrong with this listing? <a href="/login" className="underline decoration-2 underline-offset-4">Log in to report it</a>.</p>;

  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">
        <Flag size={16} aria-hidden /> Report this listing
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => state !== "sending" && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="rp-title" className="relative w-full max-w-md border-4 border-black bg-white p-6" onClick={e => e.stopPropagation()}>
            <button type="button" className="bru-btn absolute right-3 top-3 h-10 w-10 p-0" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Close"><X size={20} aria-hidden /></button>
            <h2 id="rp-title" className="font-raw mb-3 pr-12 text-xl">Report this listing</h2>
            {state === "done" ? (
              <p role="status" className="text-sm font-bold">Thanks. A moderator will review it. We don&apos;t tell the seller who reported.</p>
            ) : (
              <form onSubmit={submit} noValidate>
                {error && <p role="alert" className="mb-3 border-2 border-black bg-cc-pink p-3 text-sm font-bold">{error}</p>}
                <label htmlFor="rp-reason" className="mb-1 block text-sm font-bold">What&apos;s wrong?</label>
                <textarea ref={area} id="rp-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={4} required className="bru-input mb-1 w-full resize-none" placeholder="Scam, prohibited item, fake photos, harassment…" />
                <p className="mb-4 text-right text-xs font-bold">{reason.length}/500</p>
                <button type="submit" disabled={state === "sending"} className="bru-btn h-12 w-full bg-black text-white">
                  {state === "sending" ? <><Loader2 size={20} className="mr-2 animate-spin" aria-hidden />Sending…</> : "Send report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
