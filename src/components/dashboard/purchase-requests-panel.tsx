"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/catalog";
import { X, Loader2, MessageSquare, Package } from "lucide-react";
import type { PurchaseRequestWithDetails } from "@/services/purchase-request-service";

interface PurchaseRequestsPanelProps {
  buyerRequests: PurchaseRequestWithDetails[];
  sellerRequests: PurchaseRequestWithDetails[];
}

export function PurchaseRequestsPanel({ buyerRequests, sellerRequests }: PurchaseRequestsPanelProps) {
  // Sellers land on the offers they need to answer; otherwise show whichever side has something.
  const pendingForMe = sellerRequests.filter(r => r.status === "PENDING").length;
  const [view, setView] = useState<"buyer" | "seller">(() => (pendingForMe > 0 || (buyerRequests.length === 0 && sellerRequests.length > 0) ? "seller" : "buyer"));
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestWithDetails | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (requestId: string, status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED") => {
    setLoadingAction(requestId);
    try {
      const res = await fetch(`/api/purchase-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        // Refresh the page to get updated data
        window.location.reload();
      }
    } catch {
      // Error handled by browser
    } finally {
      setLoadingAction(null);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: "border-2 border-black bg-cc-yellow",
      ACCEPTED: "border-2 border-black bg-cc-green",
      DECLINED: "border-2 border-black bg-cc-pink",
      CANCELLED: "border-2 border-black bg-white",
      COMPLETED: "border-2 border-black bg-[#1d4ed8] text-white",
    };
    return badges[status] || "border-2 border-black bg-white";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Pending",
      ACCEPTED: "Accepted",
      DECLINED: "Declined",
      CANCELLED: "Cancelled",
      COMPLETED: "Completed",
    };
    return labels[status] || status;
  };

  const requests = view === "buyer" ? buyerRequests : sellerRequests;
  const isBuyerView = view === "buyer";

  return (
    <section aria-labelledby="pr-title" className="min-w-0">
      <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
        <h2 id="pr-title" className="font-raw text-2xl md:text-5xl">Purchase requests</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={isBuyerView}
            onClick={() => setView("buyer")}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${isBuyerView ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}
          >
            My offers ({buyerRequests.length})
          </button>
          <button
            type="button"
            aria-pressed={!isBuyerView}
            onClick={() => setView("seller")}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${!isBuyerView ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}
          >
            Offers on my items ({sellerRequests.length}{pendingForMe > 0 ? `, ${pendingForMe} pending` : ""})
          </button>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedRequest(null)} role="dialog" aria-modal="true" aria-labelledby="detail-title">
          <div className="bg-white w-full max-w-md border-4 border-black p-6 relative" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-3 right-3 bru-btn h-10 w-10 p-0"
              onClick={() => setSelectedRequest(null)}
              aria-label="Close"
            >
              <X size={20} aria-hidden />
            </button>
            <h3 id="detail-title" className="font-raw text-xl mb-1">{selectedRequest.productTitle}</h3>
            <p className="text-sm font-bold text-cc-muted mb-4">{formatINR(selectedRequest.productPrice)}</p>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-bold text-cc-muted">Status</span>
                <span className={`font-bold ${getStatusBadge(selectedRequest.status)} px-2 py-0.5 text-xs uppercase`}>{getStatusLabel(selectedRequest.status)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-cc-muted">Buyer</span>
                <span className="font-bold">{selectedRequest.buyerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-cc-muted">Submitted</span>
                <span className="font-bold">{formatDate(selectedRequest.createdAt)} at {formatTime(selectedRequest.createdAt)}</span>
              </div>
              {selectedRequest.note && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-cc-muted">Note</span>
                  <p className="font-bold whitespace-pre-line">{selectedRequest.note}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t-4 border-black">
              {selectedRequest.status === "PENDING" && !isBuyerView && (
                <>
                  <button
                    type="button"
                    className="bru-btn h-12 flex-1 bg-cc-green px-4 text-white"
                    onClick={() => handleAction(selectedRequest.id, "ACCEPTED")}
                    disabled={loadingAction === selectedRequest.id}
                  >
                    {loadingAction === selectedRequest.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : "Accept"}
                  </button>
                  <button
                    type="button"
                    className="bru-btn h-12 flex-1 bg-cc-pink px-4 text-white"
                    onClick={() => handleAction(selectedRequest.id, "DECLINED")}
                    disabled={loadingAction === selectedRequest.id}
                  >
                    {loadingAction === selectedRequest.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : "Decline"}
                  </button>
                </>
              )}
              {selectedRequest.status === "PENDING" && isBuyerView && (
                <button
                  type="button"
                  className="bru-btn h-12 flex-1 bg-white border-2 border-black"
                  onClick={() => handleAction(selectedRequest.id, "CANCELLED")}
                  disabled={loadingAction === selectedRequest.id}
                >
                  {loadingAction === selectedRequest.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : "Cancel offer"}
                </button>
              )}
              {selectedRequest.status === "ACCEPTED" && (() => {
                const mine = isBuyerView ? selectedRequest.buyerConfirmedAt : selectedRequest.sellerMarkedSoldAt;
                return (
                  <>
                    {mine ? (
                      <span className="flex h-12 flex-1 items-center justify-center border-2 border-black bg-white px-3 text-center text-sm font-bold">You confirmed. Waiting for the {isBuyerView ? "seller" : "buyer"}.</span>
                    ) : (
                      <button type="button" className="bru-btn h-12 flex-1 bg-black px-4 text-white" onClick={() => handleAction(selectedRequest.id, "COMPLETED")} disabled={loadingAction === selectedRequest.id}>
                        {loadingAction === selectedRequest.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : isBuyerView ? "I got it" : "I handed it over"}
                      </button>
                    )}
                    <Link href={`/messages?product=${selectedRequest.productId}`} className="bru-btn flex h-12 flex-1 items-center justify-center gap-2 bg-cc-orange px-4 text-black">
                      <MessageSquare size={20} aria-hidden />
                      {isBuyerView ? "Message seller" : "Message buyer"}
                    </Link>
                  </>
                );
              })()}
              {selectedRequest.status === "COMPLETED" && (
                <span className="bru-btn h-12 flex-1 bg-[#1d4ed8] px-4 text-white flex items-center justify-center gap-2 cursor-default">
                  <Package size={20} aria-hidden />
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bru-card p-8 text-center">
          {isBuyerView ? (
            <>
              <p className="font-raw text-xl mb-2">No offers sent yet</p>
              <p className="text-lg font-bold text-cc-muted mb-4">When you make an offer on a listing, it&apos;ll appear here.</p>
              <Link href="/marketplace" className="bru-btn h-12 bg-cc-orange px-6 text-base inline-flex">Browse marketplace</Link>
            </>
          ) : (
            <>
              <p className="font-raw text-xl mb-2">No offers on your listings</p>
              <p className="text-lg font-bold text-cc-muted mb-4">When buyers make offers on your active listings, they&apos;ll appear here.</p>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map(r => (
            <li key={r.id} className="bru-card p-4 hover:bg-[#fef9c3] transition-colors cursor-pointer" onClick={() => setSelectedRequest(r)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden border-2 border-black bg-cc-sky">
                    {r.productImage ? (
                      <Image src={r.productImage} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-raw text-2xl">{r.productTitle.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/products/${r.productId}`} className="font-raw text-lg leading-tight hover:underline truncate block">{r.productTitle}</Link>
                    <p className="mt-1 text-sm font-bold text-cc-muted">{formatINR(r.productPrice)}</p>
                    <p className="mt-1 text-xs font-bold text-cc-muted">
                      {isBuyerView ? `To ${r.sellerName}` : `From ${r.buyerName}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-block border-2 border-black px-3 py-1 text-xs uppercase ${getStatusBadge(r.status)}`}>{getStatusLabel(r.status)}</span>
                  <p className="text-[10px] font-bold text-cc-muted">{formatDate(r.createdAt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}