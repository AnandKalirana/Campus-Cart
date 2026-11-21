import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { verifyPassword } from "@/lib/auth/password";
import { getStore } from "@/lib/storage";
import { trySendMail } from "@/services/mailer";

/** Hard caps keep one export from becoming an unbounded query or a huge response. */
export const EXPORT_LIMITS = { listings: 500, threads: 500, messages: 5000, requests: 500, reports: 500, notifications: 500 } as const;

export interface AccountExport {
  format: "campus-cart-export-v1";
  exportedAt: string;
  truncated: boolean;
  notes: string[];
  profile: { id: string; email: string; emailVerified: string | null; name: string; role: string; campus: string | null; createdAt: string };
  listings: { id: string; title: string; description: string; price: number; originalPrice: number | null; condition: string; status: string; pickupLocation: string; photoCount: number; createdAt: string }[];
  wishlist: { listingId: string; savedAt: string }[];
  conversations: { listingTitle: string; yourRole: "buyer" | "seller"; startedAt: string; messages: { fromYou: boolean; body: string; sentAt: string }[] }[];
  purchaseRequests: { listingTitle: string; status: string; note: string | null; createdAt: string }[];
  reportsFiled: { listingTitle: string; reason: string; status: string; createdAt: string }[];
  notifications: { kind: string; title: string; read: boolean; createdAt: string }[];
}

const iso = (d: Date) => d.toISOString();

/**
 * Everything we hold about ONE user, by that user's id only (no id comes from the request).
 * Never included: password hash, session version, auth tokens, other students' email addresses or names.
 */
export async function exportAccountData(userId: string): Promise<AccountExport | null> {
  const L = EXPORT_LIMITS;
  const user = await db().user.findUnique({ where: { id: userId }, include: { university: { select: { name: true } } } });
  if (!user) return null;
  const [listings, wishlist, threads, requests, reports, notifications] = await Promise.all([
    db().product.findMany({ where: { sellerId: userId }, orderBy: { createdAt: "desc" }, take: L.listings + 1, include: { _count: { select: { images: true } } } }),
    db().wishlist.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 2000 }),
    db().conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] }, orderBy: { updatedAt: "desc" }, take: L.threads + 1,
      include: { product: { select: { title: true } }, messages: { orderBy: { createdAt: "asc" }, take: L.messages, select: { senderId: true, body: true, createdAt: true } } },
    }),
    db().purchaseRequest.findMany({ where: { buyerId: userId }, orderBy: { createdAt: "desc" }, take: L.requests + 1, include: { product: { select: { title: true } } } }),
    db().report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: "desc" }, take: L.reports + 1, include: { product: { select: { title: true } } } }),
    db().notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: L.notifications + 1 }),
  ]);
  const truncated = listings.length > L.listings || threads.length > L.threads || requests.length > L.requests || reports.length > L.reports || notifications.length > L.notifications;
  return {
    format: "campus-cart-export-v1",
    exportedAt: iso(new Date()),
    truncated,
    notes: [
      "Chat threads include what the other student wrote to you, but not their name or email.",
      "Photos are not included in this file.",
      ...(truncated ? ["Some sections were cut at a size limit. Contact support for a complete export."] : []),
    ],
    profile: { id: user.id, email: user.email, emailVerified: user.emailVerified ? iso(user.emailVerified) : null, name: user.name, role: user.role, campus: user.university?.name ?? null, createdAt: iso(user.createdAt) },
    listings: listings.slice(0, L.listings).map(p => ({ id: p.id, title: p.title, description: p.description, price: p.price, originalPrice: p.originalPrice, condition: p.condition, status: p.status, pickupLocation: p.pickupLocation, photoCount: p._count.images, createdAt: iso(p.createdAt) })),
    wishlist: wishlist.map(w => ({ listingId: w.productId, savedAt: iso(w.createdAt) })),
    conversations: threads.slice(0, L.threads).map(t => ({
      listingTitle: t.product.title, yourRole: t.buyerId === userId ? "buyer" : "seller", startedAt: iso(t.createdAt),
      messages: t.messages.map(m => ({ fromYou: m.senderId === userId, body: m.body, sentAt: iso(m.createdAt) })),
    })),
    purchaseRequests: requests.slice(0, L.requests).map(r => ({ listingTitle: r.product.title, status: r.status, note: r.note, createdAt: iso(r.createdAt) })),
    reportsFiled: reports.slice(0, L.reports).map(r => ({ listingTitle: r.product.title, reason: r.reason, status: r.status, createdAt: iso(r.createdAt) })),
    notifications: notifications.slice(0, L.notifications).map(n => ({ kind: n.kind, title: n.title, read: !!n.readAt, createdAt: iso(n.createdAt) })),
  };
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; code: "not_found" | "wrong_password" | "no_password" | "admin"; message: string };

/**
 * Permanently deletes the caller's account after re-checking their password (a stolen session alone is not enough).
 * Every table that references the user cascades, so listings, photos' rows, wishlist, chats (including the other
 * person's copy of those chats), offers, reports and notifications go with it. Audit rows keep only the pseudonymous id.
 * Admins must be demoted first so the platform cannot lose its last admin by accident.
 */
export async function deleteAccount(userId: string, password: string): Promise<DeleteResult> {
  const user = await db().user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, passwordHash: true } });
  if (!user) return { ok: false, code: "not_found", message: "This account no longer exists." };
  if (user.role === "ADMIN") return { ok: false, code: "admin", message: "Admin accounts can't be deleted here. Ask another admin to remove your admin role first." };
  if (!user.passwordHash) return { ok: false, code: "no_password", message: "Set a password with “Forgot password” first, then you can delete your account." };
  if (!(await verifyPassword(password, user.passwordHash))) return { ok: false, code: "wrong_password", message: "That password is incorrect." };

  const images = await db().productImage.findMany({ where: { product: { sellerId: userId } }, select: { publicId: true } });
  try {
    await db().$transaction([
      db().auditLog.create({ data: { actorId: null, action: "account.self_delete", targetType: "user", targetId: userId } }),
      db().user.delete({ where: { id: userId } }),
    ]);
  } catch (e) {
    // Double submit: a concurrent request already removed the account.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return { ok: false, code: "not_found", message: "This account no longer exists." };
    throw e;
  }

  // The account is already gone; a failed blob delete only leaves an orphan, so it is logged and never blocks the user.
  const results = await Promise.allSettled(images.map(i => getStore().delete(i.publicId)));
  const failed = results.filter(r => r.status === "rejected").length;
  log("info", "account_deleted", { uid: userId, photos: images.length, photosFailed: failed });

  await trySendMail({
    to: user.email,
    subject: "Your Campus Cart account was deleted",
    text: `Hi ${user.name.split(/\s+/)[0] || "there"},\n\nYour Campus Cart account, listings, messages and saved items were permanently deleted at your request.\n\nIf you didn't do this, someone else had access to your account. Reply to us or sign up again with a new password.`,
  }, "account_deleted");
  return { ok: true };
}
