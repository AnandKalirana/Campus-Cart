/**
 * What an offer should say to each side. Pure and dependency-free so the server, the UI and the tests agree.
 * The database only stores PENDING / ACCEPTED / DECLINED / CANCELLED / COMPLETED; the extra nuance
 * ("seen", "item sold", "waiting for you to confirm") is derived from timestamps and the listing's status.
 */
export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
export type OfferTone = "waiting" | "progress" | "good" | "done" | "closed";

export interface OfferFacts {
  status: OfferStatus;
  productStatus: string; // ACTIVE | PAUSED | SOLD | REMOVED
  sellerSeenAt: Date | string | null;
  sellerMarkedSoldAt: Date | string | null;
  buyerConfirmedAt: Date | string | null;
}

export interface OfferView {
  label: string;
  detail: string;
  tone: OfferTone;
  /** The offer can no longer change (nobody can accept, cancel or confirm it). */
  closed: boolean;
}

export function describeOffer(o: OfferFacts, viewer: "buyer" | "seller"): OfferView {
  const buyer = viewer === "buyer";
  if (o.status === "COMPLETED") {
    return { label: "Deal done", detail: buyer ? "This item was handed over to you." : "You marked this item as sold.", tone: "done", closed: true };
  }
  if (o.status === "DECLINED") {
    return { label: "Declined", detail: buyer ? "The seller declined this offer." : "You declined this offer.", tone: "closed", closed: true };
  }
  if (o.status === "CANCELLED") {
    return { label: "Cancelled", detail: buyer ? "You cancelled this offer." : "The buyer cancelled this offer.", tone: "closed", closed: true };
  }
  if (o.status === "ACCEPTED") {
    if (o.productStatus === "SOLD") {
      return { label: "Deal done", detail: buyer ? "This item is marked as sold." : "You marked this item as sold.", tone: "done", closed: true };
    }
    if (o.sellerMarkedSoldAt && !o.buyerConfirmedAt) {
      return {
        label: buyer ? "Confirm you got it" : "Waiting for buyer",
        detail: buyer ? "The seller says it was handed over. Confirm to finish the deal." : "You handed it over. Waiting for the buyer to confirm.",
        tone: "progress", closed: false,
      };
    }
    if (o.buyerConfirmedAt && !o.sellerMarkedSoldAt) {
      return {
        label: buyer ? "Waiting for seller" : "Confirm hand-over",
        detail: buyer ? "You confirmed. Waiting for the seller." : "The buyer says they got it. Confirm to finish the deal.",
        tone: "progress", closed: false,
      };
    }
    return { label: "Accepted", detail: buyer ? "The seller accepted. Agree a pickup spot in messages." : "You accepted. Agree a pickup spot in messages.", tone: "good", closed: false };
  }
  // PENDING: the listing may have moved on without this offer.
  if (o.productStatus === "SOLD") {
    return { label: "Item sold", detail: buyer ? "This item was sold to someone else." : "This item is already sold.", tone: "closed", closed: true };
  }
  if (o.productStatus === "REMOVED") {
    return { label: "Listing removed", detail: "This listing is no longer available.", tone: "closed", closed: true };
  }
  if (buyer) {
    return o.sellerSeenAt
      ? { label: "Seen by seller", detail: "The seller has opened your offer and hasn't replied yet.", tone: "progress", closed: false }
      : { label: "Sent", detail: "Waiting for the seller to open your offer.", tone: "waiting", closed: false };
  }
  return o.sellerSeenAt
    ? { label: "Needs your reply", detail: "Accept or decline this offer.", tone: "waiting", closed: false }
    : { label: "New", detail: "Open it to accept or decline.", tone: "waiting", closed: false };
}
