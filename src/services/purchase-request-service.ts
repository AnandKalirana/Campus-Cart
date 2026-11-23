import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Actor } from "@/services/listing-service";
import { getListingForViewer } from "@/services/listing-service";

export interface PurchaseRequestWithDetails {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  productStatus: string;
  buyerId: string;
  buyerName: string;
  sellerName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  note: string | null;
  sellerSeenAt: Date | null;
  sellerMarkedSoldAt: Date | null;
  buyerConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseRequestResult =
  | { ok: true; request: PurchaseRequestWithDetails }
  | { ok: false; code: "forbidden" | "not_found" | "invalid" | "conflict" | "limit"; message: string };

export type OfferNewStatus = "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";

// One include and one mapper for every read, so a new field can't be added to one query and forgotten in another.
const detailInclude = {
  product: {
    select: {
      id: true, title: true, price: true, status: true, sellerId: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      seller: { select: { id: true, name: true } },
    },
  },
  buyer: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseRequestInclude;

type Row = Prisma.PurchaseRequestGetPayload<{ include: typeof detailInclude }>;

function toDetails(r: Row): PurchaseRequestWithDetails {
  return {
    id: r.id,
    productId: r.product.id,
    productTitle: r.product.title,
    productPrice: r.product.price,
    productImage: r.product.images[0]?.url ?? null,
    productStatus: r.product.status,
    buyerId: r.buyer.id,
    buyerName: r.buyer.name.split(" ")[0],
    sellerName: r.product.seller.name.split(" ")[0],
    status: r.status,
    note: r.note,
    sellerSeenAt: r.sellerSeenAt,
    sellerMarkedSoldAt: r.sellerMarkedSoldAt,
    buyerConfirmedAt: r.buyerConfirmedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Create a purchase request (buyer only) */
export async function createPurchaseRequest(
  actor: Actor,
  productId: string,
  note?: string
): Promise<PurchaseRequestResult> {
  const listing = await getListingForViewer(productId, actor);
  if (!listing) {
    return { ok: false, code: "not_found", message: "Listing not found" };
  }
  const { listing: product, isOwner } = listing;

  if (isOwner) {
    return { ok: false, code: "forbidden", message: "Cannot request your own listing" };
  }

  if (product.status !== "ACTIVE") {
    return { ok: false, code: "conflict", message: "This item is not available for purchase" };
  }

  // Check if buyer already has a pending/accepted request for this product
  const existing = await db().purchaseRequest.findUnique({
    where: { productId_buyerId: { productId, buyerId: actor.id } },
    select: { status: true },
  });
  if (existing && (existing.status === "PENDING" || existing.status === "ACCEPTED")) {
    return { ok: false, code: "conflict", message: "You already have an active request for this item" };
  }

  // Check if there's already an accepted request from another buyer
  const accepted = await db().purchaseRequest.findFirst({
    where: { productId, status: "ACCEPTED" },
    select: { id: true },
  });
  if (accepted) {
    return { ok: false, code: "conflict", message: "This item already has an accepted offer" };
  }

  const request = await db().purchaseRequest.create({
    data: {
      productId,
      buyerId: actor.id,
      status: "PENDING",
      note: note?.trim().slice(0, 500) ?? null,
    },
    include: detailInclude,
  });

  return { ok: true, request: toDetails(request) };
}

/** Offers the given user sent (buyer) or received (seller). The id always comes from the session, never the request. */
export async function getPurchaseRequestsFor(userId: string, role: "buyer" | "seller"): Promise<PurchaseRequestWithDetails[]> {
  const where: Prisma.PurchaseRequestWhereInput = role === "buyer" ? { buyerId: userId } : { product: { sellerId: userId } };
  const requests = await db().purchaseRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: detailInclude });
  return requests.map(toDetails);
}

/** Get purchase requests for the current user (as buyer or seller) */
export async function getPurchaseRequests(role: "buyer" | "seller"): Promise<PurchaseRequestWithDetails[]> {
  const user = await requireUser("/dashboard");
  return getPurchaseRequestsFor(user.id, role);
}

/** Get a single purchase request with access control */
export async function getPurchaseRequest(requestId: string): Promise<PurchaseRequestWithDetails | null> {
  const user = await requireUser("/dashboard");
  const request = await db().purchaseRequest.findUnique({ where: { id: requestId }, include: detailInclude });
  if (!request) return null;
  // Only buyer or seller can view; anyone else gets the same "not found" as a missing id.
  if (request.buyerId !== user.id && request.product.sellerId !== user.id) return null;
  return toDetails(request);
}

/**
 * The seller opened this offer. Idempotent: the first open stamps the time, later opens change nothing.
 * Only the listing's seller can do this; everyone else gets not_found, same as a missing id.
 */
export async function markOfferSeenAs(userId: string, requestId: string): Promise<{ ok: true; seenAt: Date } | { ok: false; code: "not_found" }> {
  const r = await db().purchaseRequest.findUnique({ where: { id: requestId }, select: { sellerSeenAt: true, product: { select: { sellerId: true } } } });
  if (!r || r.product.sellerId !== userId) return { ok: false, code: "not_found" };
  if (r.sellerSeenAt) return { ok: true, seenAt: r.sellerSeenAt };
  const now = new Date();
  await db().purchaseRequest.updateMany({ where: { id: requestId, sellerSeenAt: null }, data: { sellerSeenAt: now } }); // a concurrent open may have won; fine
  const fresh = await db().purchaseRequest.findUnique({ where: { id: requestId }, select: { sellerSeenAt: true } });
  return { ok: true, seenAt: fresh?.sellerSeenAt ?? now };
}

export async function markOfferSeen(requestId: string) {
  const user = await requireUser("/dashboard");
  return markOfferSeenAs(user.id, requestId);
}

class Conflict extends Error {}

/** Update purchase request status (seller: accept/decline; buyer: cancel; both: complete) */
export async function updatePurchaseRequestStatus(requestId: string, newStatus: OfferNewStatus): Promise<PurchaseRequestResult> {
  const user = await requireUser("/dashboard");
  return updatePurchaseRequestStatusAs(user.id, requestId, newStatus);
}

export async function updatePurchaseRequestStatusAs(userId: string, requestId: string, newStatus: OfferNewStatus): Promise<PurchaseRequestResult> {
  const request = await db().purchaseRequest.findUnique({
    where: { id: requestId },
    include: { product: { select: { id: true, sellerId: true, status: true, title: true } } },
  });

  // A stranger gets the same answer as a missing id, so offer ids can't be probed.
  if (!request) return { ok: false, code: "not_found", message: "Request not found" };
  const isSeller = request.product.sellerId === userId;
  const isBuyer = request.buyerId === userId;
  if (!isSeller && !isBuyer) return { ok: false, code: "not_found", message: "Request not found" };

  // Validate transition permissions
  let allowed = false;
  if (isSeller && (newStatus === "ACCEPTED" || newStatus === "DECLINED") && request.status === "PENDING") allowed = true;
  if (isBuyer && newStatus === "CANCELLED" && request.status === "PENDING") allowed = true;
  if (newStatus === "COMPLETED" && request.status === "ACCEPTED") allowed = true;
  if (!allowed) {
    return { ok: false, code: "forbidden", message: request.status === "PENDING" || request.status === "ACCEPTED" ? "You can't do that with this offer." : "This offer has already been closed." };
  }

  if (newStatus === "ACCEPTED" && (request.product.status === "SOLD" || request.product.status === "REMOVED")) {
    return { ok: false, code: "conflict", message: request.product.status === "SOLD" ? "This item is already sold." : "This listing was removed." };
  }

  try {
    const updated = await db().$transaction(async tx => {
      if (newStatus === "ACCEPTED") {
        const otherAccepted = await tx.purchaseRequest.findFirst({ where: { productId: request.productId, status: "ACCEPTED", id: { not: requestId } }, select: { id: true } });
        if (otherAccepted) throw new Conflict("You already accepted another offer for this item.");
        await tx.product.update({ where: { id: request.productId }, data: { status: "PAUSED" } }); // no new offers while one is accepted
      }

      const data: Prisma.PurchaseRequestUpdateManyMutationInput = { status: newStatus };
      if (newStatus === "COMPLETED") {
        // Each side confirms for themselves. The deal only completes (and the item is only marked SOLD)
        // once BOTH have confirmed, so neither party can close it alone.
        const fresh = await tx.purchaseRequest.findUnique({ where: { id: requestId }, select: { sellerMarkedSoldAt: true, buyerConfirmedAt: true } });
        const now = new Date();
        const sellerAt = fresh?.sellerMarkedSoldAt ?? (isSeller ? now : null);
        const buyerAt = fresh?.buyerConfirmedAt ?? (isBuyer ? now : null);
        if (isSeller) data.sellerMarkedSoldAt = sellerAt;
        if (isBuyer) data.buyerConfirmedAt = buyerAt;
        if (sellerAt && buyerAt) await tx.product.update({ where: { id: request.productId }, data: { status: "SOLD" } });
        else data.status = "ACCEPTED"; // still waiting for the other side
      }
      if ((newStatus === "DECLINED" || newStatus === "CANCELLED") && request.status === "ACCEPTED") {
        const otherAccepted = await tx.purchaseRequest.findFirst({ where: { productId: request.productId, status: "ACCEPTED", id: { not: requestId } }, select: { id: true } });
        if (!otherAccepted) await tx.product.update({ where: { id: request.productId }, data: { status: "ACTIVE" } });
      }

      // Compare-and-set on the status we validated against: a double click or a second device can't apply the same transition twice.
      const done = await tx.purchaseRequest.updateMany({ where: { id: requestId, status: request.status }, data });
      if (done.count !== 1) throw new Conflict("This offer was just changed. Refresh and try again.");
      return tx.purchaseRequest.findUniqueOrThrow({ where: { id: requestId }, include: detailInclude });
    });
    return { ok: true, request: toDetails(updated) };
  } catch (e) {
    if (e instanceof Conflict) return { ok: false, code: "conflict", message: e.message };
    throw e;
  }
}

/** Pending offers the seller still has to answer (offers on sold or removed listings no longer count). */
export async function getPendingRequestCount(): Promise<number> {
  const user = await requireUser("/dashboard");
  return db().purchaseRequest.count({
    where: { product: { sellerId: user.id, status: { in: ["ACTIVE", "PAUSED"] } }, status: "PENDING" },
  });
}
