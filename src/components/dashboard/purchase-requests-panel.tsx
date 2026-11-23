"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/catalog";
import { describeOffer, type OfferTone } from "@/lib/offer-status";
import { X, Loader2, MessageSquare, Package } from "lucide-react";
import type { PurchaseRequestWithDetails } from "@/services/purchase-request-service";

interface PurchaseRequestsPanelProps {
  buyerRequests: PurchaseRequestWithDetails[];
  sellerRequests: PurchaseRequestWithDetails[];
}

type Action = "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";

const TONE_CLASS: Record<OfferTone, string> = {
  waiting: "bg-cc-yellow",
  progress: "bg-cc-sky",
  good: "bg-cc-green",
  done: "bg-[#1d4ed8] text-white",
  closed: "bg-white",
};

const formatTime = (date: Date | string) => new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function PurchaseRequestsPanel({ buyerRequests, sellerRequests }: PurchaseRequestsPanelProps) {
  const router = useRouter();
  // Sellers land on the offers they need to answer; otherwise show whichever side has something.
  const pendingForMe = sellerRequests.filter(r => r.status === "PENDING" && !describeOffer(r, "seller").closed).length;
  const [view, setView] = useState<"buyer" | "seller">(() => (pendingForMe > 0 || (buyerRequests.length === 0 && sellerRequests.length > 0) ? "seller" : "buyer"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const isBuyerView = view === "buyer";
  const requests = isBuyerView ? buyerRequests : sellerRequests;
  // Look the open offer up in fresh props, so the dialog updates itself after router.refresh().
  const selected = selectedId ? [...buyerRequests, ...sellerRequests].find(r => r.id === selectedId) ?? null : null;
  const selectedView = selected ? describeOffer(selected, isBuyerView ? "buyer" : "seller") : null;

  const close = () => { setSelectedId(null); setError(null); };

  const open = (r: PurchaseRequestWithDetails) => {
    setError(null);
    setSelectedId(r.id);
    // First time the seller opens a pending offer, tell the server so the buyer sees "Seen by seller". Best effort.
    if (!isBuyerView && r.status === "PENDING" && !r.sellerSeenAt) {
      fetch(`/api/purchase-requests/${r.id}/seen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then(res => { if (res.ok) router.refresh(); })
        .catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const handleAction = async (requestId: string, status: Action) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (res.ok && data?.ok) {
        router.refresh(); // re-render the dashboard from the server; the open dialog re-reads the updated offer
        return;
      }
      // Say what happened instead of failing silently. Everything here is a safe, user-facing message from the server.
      if (res.status === 401) setError("Your session expired. Please log in again.");
      else if (res.status === 429) setError("Too many requests. Wait a moment and try again.");
      else setError(data?.message ?? "We couldn't update this offer. Nothing was changed. Please try again.");
      if (res.status === 409 || res.status === 403 || res.status === 404) router.refresh(); // the offer changed under us: show its real state
    } catch {
      setError("Couldn't reach the server. Check your connection. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="purchase-requests" aria-labelledby="pr-title" className="min-w-0 scroll-mt-24">
      <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
        <h2 id="pr-title" className="font-raw text-2xl md:text-5xl">Purchase requests</h2>
        <div className="flex gap-2">
          <button type="button" aria-pressed={isBuyerView} onClick={() => setView("buyer")}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${isBuyerView ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}>
            My offers ({buyerRequests.length})
          </button>
          <button type="button" aria-pressed={!isBuyerView} onClick={() => setView("seller")}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${!isBuyerView ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}>
            Offers on my items ({sellerRequests.length}{pendingForMe > 0 ? `, ${pendingForMe} pending` : ""})
          </button>
        </div>
      </div>

      {selected && selectedView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close} role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div className="relative w-full max-w-md border-4 border-black bg-white p-6" onClick={e => e.stopPropagation()}>
            <button ref={closeRef} type="button" className="bru-btn absolute right-3 top-3 h-10 w-10 p-0" onClick={close} aria-label="Close">
              <X size={20} aria-hidden />
            </button>
            <h3 id="detail-title" className="font-raw mb-1 pr-12 text-xl">{selected.productTitle}</h3>
            <p className="mb-4 text-sm font-bold text-cc-muted">{formatINR(selected.productPrice)}</p>

            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-cc-muted">Status</span>
                <span className={`border-2 border-black px-2 py-0.5 text-xs font-bold uppercase ${TONE_CLASS[selectedView.tone]}`}>{selectedView.label}</span>
              </div>
              <p className="text-sm font-bold" aria-live="polite">{selectedView.detail}</p>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-cc-muted">{isBuyerView ? "Seller" : "Buyer"}</span>
                <span className="font-bold">{isBuyerView ? selected.sellerName : selected.buyerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-cc-muted">Submitted</span>
                <span className="font-bold">{formatDate(selected.createdAt)} at {formatTime(selected.createdAt)}</span>
              </div>
              {selected.note && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-cc-muted">Note</span>
                  <p className="whitespace-pre-line font-bold">{selected.note}</p>
                </div>
              )}
            </div>

            {error && <p role="alert" className="mb-4 border-2 border-black bg-cc-pink p-3 text-sm font-bold text-black">{error}</p>}

            <div className="flex gap-2 border-t-4 border-black pt-4">
              {selected.status === "PENDING" && !selectedView.closed && !isBuyerView && (
                <>
                  <button type="button" className="bru-btn h-12 flex-1 bg-cc-green px-4 text-black" onClick={() => handleAction(selected.id, "ACCEPTED")} disabled={busy}>
                    {busy ? <Loader2 size={20} className="animate-spin" aria-label="Working" /> : "Accept"}
                  </button>
                  <button type="button" className="bru-btn h-12 flex-1 bg-cc-pink px-4 text-black" onClick={() => handleAction(selected.id, "DECLINED")} disabled={busy}>
                    {busy ? <Loader2 size={20} className="animate-spin" aria-label="Working" /> : "Decline"}
                  </button>
                </>
              )}
              {selected.status === "PENDING" && !selectedView.closed && isBuyerView && (
                <button type="button" className="bru-btn h-12 flex-1 border-2 border-black bg-white" onClick={() => handleAction(selected.id, "CANCELLED")} disabled={busy}>
                  {busy ? <Loader2 size={20} className="animate-spin" aria-label="Working" /> : "Cancel offer"}
                </button>
              )}
              {selected.status === "ACCEPTED" && !selectedView.closed && (() => {
                const mine = isBuyerView ? selected.buyerConfirmedAt : selected.sellerMarkedSoldAt;
                return (
                  <>
                    {mine ? (
                      <span className="flex h-12 flex-1 items-center justify-center border-2 border-black bg-white px-3 text-center text-sm font-bold">You confirmed. Waiting for the {isBuyerView ? "seller" : "buyer"}.</span>
                    ) : (
                      <button type="button" className="bru-btn h-12 flex-1 bg-black px-4 text-white" onClick={() => handleAction(selected.id, "COMPLETED")} disabled={busy}>
                        {busy ? <Loader2 size={20} className="animate-spin" aria-label="Working" /> : isBuyerView ? "I got it" : "I handed it over"}
                      </button>
                    )}
                    <Link href={`/messages?product=${selected.productId}`} className="bru-btn flex h-12 flex-1 items-center justify-center gap-2 bg-cc-orange px-4 text-black">
                      <MessageSquare size={20} aria-hidden />
                      {isBuyerView ? "Message seller" : "Message buyer"}
                    </Link>
                  </>
                );
              })()}
              {selectedView.tone === "done" && (
                <span className="flex h-12 flex-1 cursor-default items-center justify-center gap-2 border-2 border-black bg-[#1d4ed8] px-4 text-white">
                  <Package size={20} aria-hidden />
                  Deal done
                </span>
              )}
              {selectedView.tone === "closed" && (
                <button type="button" className="bru-btn h-12 flex-1 border-2 border-black bg-white" onClick={close}>Close</button>
              )}
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bru-card p-8 text-center">
          {isBuyerView ? (
            <>
              <p className="font-raw mb-2 text-xl">No offers sent yet</p>
              <p className="mb-4 text-lg font-bold text-cc-muted">When you make an offer on a listing, it&apos;ll appear here.</p>
              <Link href="/marketplace" className="bru-btn inline-flex h-12 bg-cc-orange px-6 text-base">Browse marketplace</Link>
            </>
          ) : (
            <>
              <p className="font-raw mb-2 text-xl">No offers on your listings</p>
              <p className="mb-4 text-lg font-bold text-cc-muted">When buyers make offers on your active listings, they&apos;ll appear here.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map(r => {
            const v = describeOffer(r, isBuyerView ? "buyer" : "seller");
            return (
              <li key={r.id} className="bru-card cursor-pointer p-4 transition-colors hover:bg-[#fef9c3]" onClick={() => open(r)}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border-2 border-black bg-cc-sky">
                      {r.productImage ? (
                        <Image src={r.productImage} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-raw text-2xl">{r.productTitle.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/products/${r.productId}`} onClick={e => e.stopPropagation()} className="font-raw block truncate text-lg leading-tight hover:underline">{r.productTitle}</Link>
                      <p className="mt-1 text-sm font-bold text-cc-muted">{formatINR(r.productPrice)}</p>
                      <p className="mt-1 text-xs font-bold text-cc-muted">{isBuyerView ? `To ${r.sellerName}` : `From ${r.buyerName}`}</p>
                      <p className="mt-1 text-xs font-bold">{v.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-block border-2 border-black px-3 py-1 text-xs uppercase ${TONE_CLASS[v.tone]}`}>{v.label}</span>
                    <p className="text-[10px] font-bold text-cc-muted">{formatDate(r.createdAt)}</p>
                    <button type="button" className="bru-btn h-9 bg-white px-3 text-xs" onClick={e => { e.stopPropagation(); open(r); }} aria-label={`Open offer for ${r.productTitle}`}>Open</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
