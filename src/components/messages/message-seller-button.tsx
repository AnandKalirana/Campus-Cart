"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, X } from "lucide-react";

interface Props { productId: string; productTitle: string; sellerName: string }

const MAX = 2000;

/** Starts a conversation with the seller. The server decides everything that matters (who, limits, listing state); this only collects text. */
export function MessageSellerButton({ productId, productTitle, sellerName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    areaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sending) close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, sending]);

  function close() { setOpen(false); setError(null); triggerRef.current?.focus(); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) { setError("Write a message first."); return; }
    if (sending) return; // double-click guard: one request in flight
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${productId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(`/products/${productId}`)}`); return; }
      if (res.ok && data?.ok) { router.push(`/messages/${data.conversationId}`); return; }
      setError(res.status === 429 ? "You're sending a lot of messages. Try again in a bit." : data?.message ?? "Couldn't send your message. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="bru-btn flex h-14 flex-1 items-center justify-center gap-2 bg-white px-8 text-xl">
        <MessageCircle size={22} aria-hidden /> Message seller
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !sending && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="ms-title" className="relative w-full max-w-md border-4 border-black bg-white p-6" onClick={e => e.stopPropagation()}>
            <button type="button" className="bru-btn absolute right-3 top-3 h-10 w-10 p-0" onClick={close} disabled={sending} aria-label="Close"><X size={20} aria-hidden /></button>
            <h2 id="ms-title" className="font-raw mb-1 pr-12 text-xl">Message {sellerName}</h2>
            <p className="mb-4 text-sm font-bold [overflow-wrap:anywhere]">About: {productTitle}</p>
            <form onSubmit={submit} noValidate>
              {error && <p role="alert" className="mb-4 border-2 border-black bg-cc-pink p-3 text-sm font-bold">{error}</p>}
              <label htmlFor="ms-body" className="mb-1 block text-sm font-bold">Your message</label>
              <textarea ref={areaRef} id="ms-body" value={text} onChange={e => setText(e.target.value)} maxLength={MAX} rows={4} required
                className="bru-input mb-1 w-full resize-none" placeholder="Hi! Is this still available? Can we meet at the library?" />
              <p className="mb-4 text-right text-xs font-bold" aria-live="polite">{text.length}/{MAX}</p>
              <p className="mb-4 text-xs font-bold">Don&apos;t share passwords or payment details. Campus Cart never asks for them.</p>
              <div className="flex gap-3">
                <button type="button" className="bru-btn h-12 flex-1 border-2 border-black bg-white" onClick={close} disabled={sending}>Cancel</button>
                <button type="submit" className="bru-btn h-12 flex-1 bg-black text-white" disabled={sending}>
                  {sending ? <><Loader2 size={20} className="mr-2 animate-spin" aria-hidden />Sending…</> : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
