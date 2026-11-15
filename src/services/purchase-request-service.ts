"use server";

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
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  note: string | null;
  sellerMarkedSoldAt: Date | null;
  buyerConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseRequestResult =
  | { ok: true; request: PurchaseRequestWithDetails }
  | { ok: false; code: "forbidden" | "not_found" | "invalid" | "conflict" | "limit"; message: string };

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
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        },
      },
      buyer: { select: { id: true, name: true } },
    },
  });

  return {
    ok: true,
    request: {
      id: request.id,
      productId: request.product.id,
      productTitle: request.product.title,
      productPrice: request.product.price,
      productImage: request.product.images[0]?.url ?? null,
      productStatus: request.product.status,
      buyerId: request.buyer.id,
      buyerName: request.buyer.name.split(" ")[0],
      status: request.status,
      note: request.note,
      sellerMarkedSoldAt: request.sellerMarkedSoldAt,
      buyerConfirmedAt: request.buyerConfirmedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
  };
}

/** Get purchase requests for the current user (as buyer or seller) */
export async function getPurchaseRequests(role: "buyer" | "seller"): Promise<PurchaseRequestWithDetails[]> {
  const user = await requireUser("/dashboard");

  const where = role === "buyer"
    ? { buyerId: user.id }
    : { product: { sellerId: user.id } };

  const requests = await db().purchaseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          seller: { select: { id: true, name: true } },
        },
      },
      buyer: { select: { id: true, name: true } },
    },
  });

  return requests.map(r => ({
    id: r.id,
    productId: r.product.id,
    productTitle: r.product.title,
    productPrice: r.product.price,
    productImage: r.product.images[0]?.url ?? null,
    productStatus: r.product.status,
    buyerId: r.buyer.id,
    buyerName: r.buyer.name.split(" ")[0],
    status: r.status,
    note: r.note,
    sellerMarkedSoldAt: r.sellerMarkedSoldAt,
    buyerConfirmedAt: r.buyerConfirmedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/** Get a single purchase request with access control */
export async function getPurchaseRequest(requestId: string): Promise<PurchaseRequestWithDetails | null> {
  const user = await requireUser("/dashboard");

  const request = await db().purchaseRequest.findUnique({
    where: { id: requestId },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          sellerId: true,
          seller: { select: { id: true, name: true } },
        },
      },
      buyer: { select: { id: true, name: true } },
    },
  });

  if (!request) return null;

  // Only buyer or seller can view
  if (request.buyerId !== user.id && request.product.sellerId !== user.id) {
    return null;
  }

  return {
    id: request.id,
    productId: request.product.id,
    productTitle: request.product.title,
    productPrice: request.product.price,
    productImage: request.product.images[0]?.url ?? null,
    productStatus: request.product.status,
    buyerId: request.buyer.id,
    buyerName: request.buyer.name.split(" ")[0],
    status: request.status,
    note: request.note,
    sellerMarkedSoldAt: request.sellerMarkedSoldAt,
    buyerConfirmedAt: request.buyerConfirmedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

/** Update purchase request status (seller: accept/decline; buyer: cancel; both: complete) */
export async function updatePurchaseRequestStatus(
  requestId: string,
  newStatus: "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED"
): Promise<PurchaseRequestResult> {
  const user = await requireUser("/dashboard");

  const request = await db().purchaseRequest.findUnique({
    where: { id: requestId },
    include: {
      product: { select: { id: true, sellerId: true, status: true, title: true } },
      buyer: { select: { id: true, name: true } },
    },
  });

  if (!request) {
    return { ok: false, code: "not_found", message: "Request not found" };
  }

  const isSeller = request.product.sellerId === user.id;
  const isBuyer = request.buyerId === user.id;

  // Validate transition permissions
  let allowed = false;
  if (isSeller && ["ACCEPTED", "DECLINED"].includes(newStatus) && request.status === "PENDING") {
    allowed = true;
  }
  if (isBuyer && newStatus === "CANCELLED" && request.status === "PENDING") {
    allowed = true;
  }
  if ((isSeller || isBuyer) && newStatus === "COMPLETED" && request.status === "ACCEPTED") {
    allowed = true;
  }
  if (!allowed) {
    return { ok: false, code: "forbidden", message: "Invalid status transition" };
  }

  // Additional validation for ACCEPTED
  if (newStatus === "ACCEPTED") {
    if (request.product.status !== "ACTIVE") {
      return { ok: false, code: "conflict", message: "Listing is no longer active" };
    }
    // Check no other accepted request exists
    const otherAccepted = await db().purchaseRequest.findFirst({
      where: { productId: request.productId, status: "ACCEPTED", id: { not: requestId } },
      select: { id: true },
    });
    if (otherAccepted) {
      return { ok: false, code: "conflict", message: "Another offer already accepted" };
    }
  }

  // Perform update with side effects
  const updated = await db().$transaction(async tx => {
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "ACCEPTED") {
      updateData.sellerMarkedSoldAt = new Date();
      // Pause the listing so no new requests come in
      await tx.product.update({
        where: { id: request.productId },
        data: { status: "PAUSED" },
      });
    }
    if (newStatus === "COMPLETED") {
      if (isSeller) updateData.sellerMarkedSoldAt = new Date();
      if (isBuyer) updateData.buyerConfirmedAt = new Date();
      // Check if both parties confirmed
      const fresh = await tx.purchaseRequest.findUnique({ where: { id: requestId }, select: { sellerMarkedSoldAt: true, buyerConfirmedAt: true } });
      if (fresh?.sellerMarkedSoldAt && fresh?.buyerConfirmedAt) {
        await tx.product.update({
          where: { id: request.productId },
          data: { status: "SOLD" },
        });
      }
    }
    if (newStatus === "DECLINED" || newStatus === "CANCELLED") {
      // If this was the only accepted request, reactivate the listing
      if (request.status === "ACCEPTED") {
        const otherAccepted = await tx.purchaseRequest.findFirst({
          where: { productId: request.productId, status: "ACCEPTED", id: { not: requestId } },
          select: { id: true },
        });
        if (!otherAccepted) {
          await tx.product.update({
            where: { id: request.productId },
            data: { status: "ACTIVE" },
          });
        }
      }
    }

    return tx.purchaseRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          },
        },
        buyer: { select: { id: true, name: true } },
      },
    });
  });

  return {
    ok: true,
    request: {
      id: updated.id,
      productId: updated.product.id,
      productTitle: updated.product.title,
      productPrice: updated.product.price,
      productImage: updated.product.images[0]?.url ?? null,
      productStatus: updated.product.status,
      buyerId: updated.buyer.id,
      buyerName: updated.buyer.name.split(" ")[0],
      status: updated.status,
      note: updated.note,
      sellerMarkedSoldAt: updated.sellerMarkedSoldAt,
      buyerConfirmedAt: updated.buyerConfirmedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  };
}

/** Get pending purchase request count for seller badge */
export async function getPendingRequestCount(): Promise<number> {
  const user = await requireUser("/dashboard");
  return db().purchaseRequest.count({
    where: {
      product: { sellerId: user.id },
      status: "PENDING",
    },
  });
}