"use client";

import { useState } from "react";
import { Send, X, Loader2 } from "lucide-react";

interface PurchaseRequestButtonProps {
  productId: string;
  productTitle: string;
  productPrice: number;
}

export function PurchaseRequestButton({ productId, productTitle, productPrice }: PurchaseRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setNote("");
        setTimeout(() => setOpen(false), 2000);
      } else {
        setError(data.message || "Failed to create request");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  if (success) {
    return (
      <div className="bru-card p-6 text-center border-4 border-black bg-cc-green">
        <p className="font-raw text-xl mb-2">Request sent!</p>
        <p className="font-bold">The seller will review your offer for <span className="underline">{productTitle}</span>.</p>
        <p className="mt-2 text-sm text-cc-muted">You&apos;ll be notified when they respond.</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="bru-btn h-14 bg-black px-8 text-xl flex-1 text-white flex items-center justify-center gap-2"
        onClick={() => setOpen(true)}
        disabled={submitting}
      >
        <Send size={22} aria-hidden />
        Make an offer
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-labelledby="pr-title">
          <div className="bg-white w-full max-w-md border-4 border-black p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-3 right-3 bru-btn h-10 w-10 p-0"
              onClick={() => { setOpen(false); setError(null); }}
              aria-label="Close"
            >
              <X size={20} aria-hidden />
            </button>
            <h2 id="pr-title" className="font-raw text-xl mb-1">Make an offer</h2>
            <p className="text-sm font-bold text-cc-muted mb-4">{productTitle} · {formatPrice(productPrice)}</p>
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-4 p-3 border-2 border-black bg-cc-pink text-sm font-bold">{error}</div>}
              <label htmlFor="pr-note" className="block text-sm font-bold mb-1">Note to seller (optional)</label>
              <textarea
                id="pr-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={500}
                rows={4}
                className="bru-input w-full mb-4 resize-none"
                placeholder="Hey, I&apos;m interested! Can we meet at the library tomorrow?"
              />
              <p className="text-right text-xs font-bold text-cc-muted mb-4">{note.length}/500</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="bru-btn h-12 flex-1 bg-white border-2 border-black"
                  onClick={() => { setOpen(false); setError(null); }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bru-btn h-12 flex-1 bg-black text-white"
                  disabled={submitting || note.length > 500}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin mr-2" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send offer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}