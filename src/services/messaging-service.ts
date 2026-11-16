import "server-only";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { Actor } from "@/services/listing-service";
import { getListingForViewer } from "@/services/listing-service";

export interface ConversationWithDetails {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  otherPartyId: string;
  otherPartyName: string;
  lastMessage: string | null;
  lastMessageTime: Date;
  lastMessageSenderId: string | null;
  unreadCount: number;
  isBuyer: boolean;
  updatedAt: Date;
}

export interface MessageWithSender {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  isOwn: boolean;
}

export type SendMessageResult =
  | { ok: true; message: MessageWithSender; conversationId: string }
  | { ok: false; code: "forbidden" | "not_found" | "invalid"; message: string };

/** Get all conversations for the current user (as buyer or seller) */
export async function getConversations(): Promise<ConversationWithDetails[]> {
  const user = await requireUser("/messages");

  const conversations = await db().conversation.findMany({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, senderId: true, readAt: true, createdAt: true },
      },
      _count: {
        select: { messages: { where: { readAt: null, senderId: { not: user.id } } } },
      },
    },
  });

  return conversations.map(c => {
    const isBuyer = c.buyerId === user.id;
    const other = isBuyer ? c.seller : c.buyer;
    const lastMsg = c.messages[0];
    return {
      id: c.id,
      productId: c.product.id,
      productTitle: c.product.title,
      productPrice: c.product.price,
      productImage: c.product.images[0]?.url ?? null,
      otherPartyId: other.id,
      otherPartyName: other.name.split(" ")[0],
      lastMessage: lastMsg?.body ?? null,
      lastMessageTime: lastMsg?.createdAt ?? c.createdAt,
      lastMessageSenderId: lastMsg?.senderId ?? null,
      unreadCount: c._count.messages,
      isBuyer,
      updatedAt: c.updatedAt,
    };
  });
}

/** Get messages for a conversation (paginated, newest first) */
export async function getMessages(conversationId: string, cursor?: string, limit = 50, after?: string): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> {
  const user = await requireUser("/messages");

  const conversation = await db().conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true },
  });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    throw new Error("Not found");
  }

  const messages = await db().message.findMany({
    where: {
      conversationId,
      ...(after ? { createdAt: { gt: new Date(after) } } : cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    // `after` = newer than this (live polling, oldest first); otherwise newest first for paging back through history.
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: limit + 1,
    include: { sender: { select: { id: true, name: true } } },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

  return {
    messages: items.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name.split(" ")[0],
      body: m.body,
      readAt: m.readAt,
      createdAt: m.createdAt,
      isOwn: m.senderId === user.id,
    })).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), // always oldest first
    nextCursor,
  };
}

/** Send a message in a conversation (creates conversation if first message from buyer) */
export async function sendMessage(
  actor: Actor,
  productId: string,
  body: string
): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { ok: false, code: "invalid", message: "Message must be 1-2000 characters" };
  }

  const listing = await getListingForViewer(productId, actor);
  if (!listing) {
    return { ok: false, code: "not_found", message: "Listing not found" };
  }
  const { listing: product, isOwner } = listing;

  if (product.status === "SOLD" || product.status === "REMOVED") {
    return { ok: false, code: "forbidden", message: "Cannot message on this listing" };
  }

  if (isOwner) {
    return { ok: false, code: "forbidden", message: "Cannot message yourself" };
  }

  const conversation = await db().$transaction(async tx => {
    let convo = await tx.conversation.findUnique({
      where: { productId_buyerId: { productId, buyerId: actor.id } },
    });

    if (!convo) {
      convo = await tx.conversation.create({
        data: {
          productId,
          buyerId: actor.id,
          sellerId: product.sellerId,
        },
      });
    }

    const message = await tx.message.create({
      data: {
        conversationId: convo.id,
        senderId: actor.id,
        body: trimmed,
      },
    });

    await tx.conversation.update({
      where: { id: convo.id },
      data: { updatedAt: new Date() },
    });

    return { conversation: convo, message };
  });

  const msg = conversation.message;
  return {
    ok: true,
    conversationId: conversation.conversation.id,
    message: {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: actor.name.split(" ")[0],
      body: msg.body,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      isOwn: true,
    },
  };
}

/** Mark messages as read up to a certain message (or all) */
export async function markMessagesRead(conversationId: string, messageId?: string): Promise<void> {
  const user = await requireUser("/messages");

  const conversation = await db().conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true },
  });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    return;
  }

  await db().message.updateMany({
    where: {
      conversationId,
      senderId: { not: user.id },
      readAt: null,
      ...(messageId && { id: { lte: messageId } }),
    },
    data: { readAt: new Date() },
  });
}

/** Get unread message count for the current user */
export async function getUnreadCount(): Promise<number> {
  const user = await requireUser("/messages");
  return db().message.count({
    where: {
      conversation: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      senderId: { not: user.id },
      readAt: null,
    },
  });
}
/** The buyer's existing thread for a listing, if any (so the product page can offer "Open chat" instead of a second composer). */
export async function findBuyerConversationId(buyerId: string, productId: string): Promise<string | null> {
  const c = await db().conversation.findUnique({ where: { productId_buyerId: { productId, buyerId } }, select: { id: true } });
  return c?.id ?? null;
}

/**
 * Reply inside an existing thread. Either participant may reply (the seller could not before: sendMessage refuses the listing's owner).
 * Strangers get the same "not found" as a thread that does not exist.
 */
export async function replyInConversation(actor: Actor, conversationId: string, body: string): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) return { ok: false, code: "invalid", message: "Message must be 1-2000 characters" };
  const c = await db().conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, buyerId: true, sellerId: true, product: { select: { status: true } }, buyer: { select: { status: true } }, seller: { select: { status: true } } },
  });
  if (!c || (c.buyerId !== actor.id && c.sellerId !== actor.id)) return { ok: false, code: "not_found", message: "Conversation not found" };
  if (c.product.status === "REMOVED" || c.buyer.status !== "ACTIVE" || c.seller.status !== "ACTIVE") {
    return { ok: false, code: "forbidden", message: "This conversation is closed" };
  }
  const msg = await db().$transaction(async tx => {
    const m = await tx.message.create({ data: { conversationId: c.id, senderId: actor.id, body: trimmed } });
    await tx.conversation.update({ where: { id: c.id }, data: { updatedAt: new Date() } });
    return m;
  });
  return {
    ok: true,
    conversationId: c.id,
    message: { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, senderName: actor.name.split(" ")[0], body: msg.body, readAt: msg.readAt, createdAt: msg.createdAt, isOwn: true },
  };
}
