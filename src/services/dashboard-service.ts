"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { listOwnListings } from "@/services/listing-service";
import { ListingCardData } from "@/services/listing-service";

export interface DashboardStats {
  activeListings: number;
  draftListings: number;
  soldListings: number;
  totalEarned: number;
  unreadMessages: number;
  savedItems: number;
}

export interface DashboardData {
  stats: DashboardStats;
  listings: {
    active: ListingCardData[];
    draft: ListingCardData[];
    sold: ListingCardData[];
  };
}

/** Fetch all dashboard data for the current user in parallel */
export async function getDashboardData(): Promise<DashboardData> {
  const user = await requireUser("/dashboard");

  const [myListings, stats] = await Promise.all([
    listOwnListings(user.id),
    getDashboardStats(user.id),
  ]);

  return {
    stats,
    listings: {
      active: myListings.filter(l => l.status === "ACTIVE"),
      draft: myListings.filter(l => l.status === "PAUSED"),
      sold: myListings.filter(l => l.status === "SOLD"),
    },
  };
}

/** Calculate dashboard statistics for a user */
async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [
    activeCount,
    draftCount,
    soldCount,
    earnedAgg,
    unreadCount,
    savedCount,
  ] = await Promise.all([
    db().product.count({ where: { sellerId: userId, status: "ACTIVE" } }),
    db().product.count({ where: { sellerId: userId, status: "PAUSED" } }),
    db().product.count({ where: { sellerId: userId, status: "SOLD" } }),
    db().product.aggregate({
      where: { sellerId: userId, status: "SOLD" },
      _sum: { price: true },
    }),
    db().message.count({
      where: {
        conversation: { buyerId: userId },
        readAt: null,
        senderId: { not: userId },
      },
    }),
    db().wishlist.count({ where: { userId } }),
  ]);

  return {
    activeListings: activeCount,
    draftListings: draftCount,
    soldListings: soldCount,
    totalEarned: earnedAgg._sum.price ?? 0,
    unreadMessages: unreadCount,
    savedItems: savedCount,
  };
}

/** Get user's saved (wishlist) items with full product data */
export async function getSavedItems() {
  const user = await requireUser("/wishlist");

  const items = await db().wishlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          category: { select: { slug: true, name: true } },
          university: { select: { name: true } },
          images: { orderBy: { position: "asc" }, take: 1, select: { id: true, url: true, alt: true } },
          seller: { select: { name: true } },
        },
      },
    },
  });

  return items.map(w => {
    const p = w.product;
    const img = p.images[0];
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      originalPrice: p.originalPrice,
      condition: p.condition,
      categorySlug: p.category.slug,
      categoryName: p.category.name,
      campusName: p.university.name,
      image: img?.url ?? null,
      imageAlt: img?.alt ?? p.title,
      status: p.status,
      sellerName: p.seller.name.split(" ")[0],
      savedAt: w.createdAt,
    };
  });
}

/** Get recent conversations for the user (as buyer or seller) */
export async function getRecentConversations(limit = 5) {
  const user = await requireUser("/messages");

  const conversations = await db().conversation.findMany({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, senderId: true, readAt: true, createdAt: true },
      },
    },
  });

  return conversations.map(c => {
    const isBuyer = c.buyerId === user.id;
    const other = isBuyer ? c.seller : c.buyer;
    const lastMsg = c.messages[0];
    const unread = lastMsg && lastMsg.senderId !== user.id && !lastMsg.readAt;

    return {
      id: c.id,
      productId: c.product.id,
      productTitle: c.product.title,
      productPrice: c.product.price,
      productImage: c.product.images[0]?.url ?? null,
      otherParty: other.name,
      otherPartyId: other.id,
      lastMessage: lastMsg?.body ?? null,
      lastMessageTime: lastMsg?.createdAt ?? c.createdAt,
      unread,
      isBuyer,
    };
  });
}