import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Which of these listings has this user saved? One query for a whole page of cards. */
export async function savedIdsFor(userId: string | null | undefined, productIds: string[]): Promise<Set<string>> {
  if (!userId || productIds.length === 0) return new Set();
  const rows = await db().wishlist.findMany({ where: { userId, productId: { in: productIds } }, select: { productId: true } });
  return new Set(rows.map(r => r.productId));
}

export type WishlistResult = { ok: true; saved: boolean } | { ok: false; code: "not_found" };

/** Set (not toggle) so a double click or a retry can never flip the state back. Saving needs a publicly visible, active listing; removing always works. */
export async function setSaved(userId: string, productId: string, saved: boolean): Promise<WishlistResult> {
  if (!saved) {
    await db().wishlist.deleteMany({ where: { userId, productId } });
    return { ok: true, saved: false };
  }
  const p = await db().product.findFirst({ where: { id: productId, status: "ACTIVE", seller: { status: "ACTIVE" } }, select: { id: true } });
  if (!p) return { ok: false, code: "not_found" };
  try {
    await db().wishlist.create({ data: { userId, productId } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // already saved: fine
  }
  return { ok: true, saved: true };
}
