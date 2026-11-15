import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { PAGE_SIZE, MAX_IMAGES, type ConditionValue, type ListingCardData, type StatusValue } from "@/lib/listing-format";
import type { ListingInput, SearchParams } from "@/lib/validation/listing";
import { getStore } from "@/lib/storage";
import { processImage } from "@/lib/images";
import { randomUUID } from "node:crypto";

export type { ListingCardData } from "@/lib/listing-format";

export interface Actor { id: string; name: string; role: "STUDENT" | "ADMIN"; emailVerified: boolean; universityId: string | null }

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; code: "forbidden" | "not_found" | "invalid" | "limit" | "conflict"; message: string; field?: string };
const fail = (code: Exclude<ServiceResult<never>, { ok: true }>["code"], message: string, field?: string): ServiceResult<never> => ({ ok: false, code, message, field });

export const MAX_OPEN_LISTINGS = 50; // ACTIVE + PAUSED per seller. Abuse/cost guard.

// A listing is publicly visible when ACTIVE (browsable) or SOLD (detail page only, shows a banner)
// and its seller is in good standing. Everything else is invisible to everyone but the owner.
const publicWhere: Prisma.ProductWhereInput = { status: { in: ["ACTIVE", "SOLD"] }, seller: { status: "ACTIVE" } };

const cardSelect = {
  id: true, title: true, description: true, price: true, originalPrice: true, condition: true, status: true,
  category: { select: { slug: true, name: true } },
  university: { select: { name: true } },
  images: { select: { id: true, url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;
export function toCard(p: CardRow): ListingCardData {
  const img = p.images[0];
  return {
    id: p.id, title: p.title, description: p.description, categorySlug: p.category.slug, categoryName: p.category.name,
    condition: p.condition as ConditionValue, price: p.price, originalPrice: p.originalPrice, campusName: p.university.name,
    image: img?.url ?? null, imageAlt: img?.alt ?? p.title, status: p.status as StatusValue,
  };
}

export async function listCategoriesAndCampuses() {
  const [categories, campuses] = await Promise.all([
    db().category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }),
    db().university.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
  ]);
  return { categories, campuses };
}

export async function searchListings(p: SearchParams): Promise<{ items: ListingCardData[]; total: number; page: number; pages: number }> {
  const where: Prisma.ProductWhereInput = {
    ...publicWhere, status: "ACTIVE", // sold items don't appear in browse
    ...(p.category && { category: { slug: p.category } }),
    ...(p.campus && { university: { slug: p.campus } }),
    ...(p.condition && { condition: p.condition }),
    ...((p.min !== undefined || p.max !== undefined) && { price: { ...(p.min !== undefined && { gte: p.min }), ...(p.max !== undefined && { lte: p.max }) } }),
    ...(p.q && { OR: [{ title: { contains: p.q, mode: "insensitive" } }, { description: { contains: p.q, mode: "insensitive" } }] }),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price_asc" ? [{ price: "asc" }, { id: "asc" }] : p.sort === "price_desc" ? [{ price: "desc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }];
  const [total, rows] = await Promise.all([
    db().product.count({ where }),
    db().product.findMany({ where, orderBy, skip: (p.page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
  ]);
  return { items: rows.map(toCard), total, page: p.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function latestListings(n = 4): Promise<ListingCardData[]> {
  const rows = await db().product.findMany({ where: { ...publicWhere, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: n, select: cardSelect });
  return rows.map(toCard);
}

/** Detail view. Returns null (-> 404) for anything the viewer may not see, so hidden ids can't be probed. */
export async function getListingForViewer(id: string, viewer: { id: string; role: string } | null) {
  const p = await db().product.findUnique({
    where: { id },
    include: {
      category: { select: { slug: true, name: true } },
      university: { select: { name: true, slug: true } },
      seller: { select: { id: true, name: true, status: true, createdAt: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, position: true } },
    },
  });
  if (!p) return null;
  const isOwner = viewer?.id === p.sellerId;
  const isAdmin = viewer?.role === "ADMIN";
  const visible = (p.status === "ACTIVE" || p.status === "SOLD") && p.seller.status === "ACTIVE";
  if (!visible && !isOwner && !isAdmin) return null;
  if (p.status === "REMOVED" && !isAdmin) return null; // owner-removed listings are gone for the owner too
  return { listing: p, isOwner };
}

/** For edit screens: owner only. Not-owner and not-found are indistinguishable on purpose. */
export async function getOwnedListing(id: string, userId: string) {
  const p = await db().product.findFirst({
    where: { id, sellerId: userId, status: { not: "REMOVED" } },
    include: { category: { select: { slug: true } }, images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, position: true } } },
  });
  return p;
}

export async function listOwnListings(userId: string) {
  const rows = await db().product.findMany({ where: { sellerId: userId, status: { not: "REMOVED" } }, orderBy: { updatedAt: "desc" }, take: 100, select: cardSelect });
  return rows.map(toCard);
}

function canSell(a: Actor): ServiceResult<never> | null {
  if (!a.emailVerified) return fail("forbidden", "Verify your college email before listing items.");
  if (!a.universityId) return fail("forbidden", "Choose your campus in your profile before listing items.");
  return null;
}

async function resolveCategory(slug: string) {
  return db().category.findFirst({ where: { slug, isActive: true }, select: { id: true } });
}

/** New listings start PAUSED (hidden). They go live through publishListing once they have a photo. */
export async function createListing(actor: Actor, input: ListingInput): Promise<ServiceResult<{ id: string }>> {
  const blocked = canSell(actor);
  if (blocked) return blocked;
  const open = await db().product.count({ where: { sellerId: actor.id, status: { in: ["ACTIVE", "PAUSED"] } } });
  if (open >= MAX_OPEN_LISTINGS) return fail("limit", `You can have up to ${MAX_OPEN_LISTINGS} open listings. Mark some as sold or remove them first.`);
  const category = await resolveCategory(input.categorySlug);
  if (!category) return fail("invalid", "Choose a valid category.", "categorySlug");
  const p = await db().product.create({
    data: {
      sellerId: actor.id, universityId: actor.universityId!, // campus always comes from the account, never from the request
      categoryId: category.id, title: input.title, description: input.description, price: input.price,
      originalPrice: input.originalPrice ?? null, condition: input.condition, pickupLocation: input.pickupLocation, status: "PAUSED",
    },
    select: { id: true },
  });
  return { ok: true, value: p };
}

export async function updateListing(actor: Actor, id: string, input: ListingInput): Promise<ServiceResult<{ id: string }>> {
  const category = await resolveCategory(input.categorySlug);
  if (!category) return fail("invalid", "Choose a valid category.", "categorySlug");
  // Ownership is part of the WHERE clause: one atomic statement, no check-then-act gap.
  const r = await db().product.updateMany({
    where: { id, sellerId: actor.id, status: { not: "REMOVED" } },
    data: { categoryId: category.id, title: input.title, description: input.description, price: input.price, originalPrice: input.originalPrice ?? null, condition: input.condition, pickupLocation: input.pickupLocation },
  });
  return r.count === 1 ? { ok: true, value: { id } } : fail("not_found", "Listing not found.");
}

type Transition = "publish" | "pause" | "sold" | "remove";
const TRANSITIONS: Record<Transition, { to: StatusValue; from: StatusValue[] }> = {
  publish: { to: "ACTIVE", from: ["PAUSED"] },
  pause: { to: "PAUSED", from: ["ACTIVE"] },
  sold: { to: "SOLD", from: ["ACTIVE", "PAUSED"] },
  remove: { to: "REMOVED", from: ["ACTIVE", "PAUSED", "SOLD"] },
};

export async function changeListingStatus(actor: Actor, id: string, action: Transition): Promise<ServiceResult<{ status: StatusValue }>> {
  const t = TRANSITIONS[action];
  if (action === "publish") {
    const blocked = canSell(actor);
    if (blocked) return blocked;
    const n = await db().productImage.count({ where: { productId: id, product: { sellerId: actor.id } } });
    if (n < 1) return fail("invalid", "Add at least one photo before publishing.");
  }
  const r = await db().product.updateMany({ where: { id, sellerId: actor.id, status: { in: t.from } }, data: { status: t.to } });
  if (r.count !== 1) {
    const exists = await db().product.findFirst({ where: { id, sellerId: actor.id }, select: { status: true } });
    return exists ? fail("conflict", "That change isn't available for this listing's current status.") : fail("not_found", "Listing not found.");
  }
  if (action === "remove") await purgeImages(id).catch(() => undefined); // best effort: orphaned blobs are harmless, a failed removal isn't
  return { ok: true, value: { status: t.to } };
}

async function purgeImages(productId: string) {
  const imgs = await db().productImage.findMany({ where: { productId }, select: { publicId: true } });
  const store = getStore();
  await Promise.allSettled(imgs.map(i => store.delete(i.publicId)));
}

export async function addListingImage(actor: Actor, productId: string, bytes: Buffer, alt?: string): Promise<ServiceResult<{ id: string; url: string }>> {
  const owned = await db().product.findFirst({ where: { id: productId, sellerId: actor.id, status: { not: "REMOVED" } }, select: { id: true, title: true } });
  if (!owned) return fail("not_found", "Listing not found.");
  const count = await db().productImage.count({ where: { productId } });
  if (count >= MAX_IMAGES) return fail("limit", `You can add up to ${MAX_IMAGES} photos.`);
  let processed;
  try { processed = await processImage(bytes); } catch (e) { return fail("invalid", e instanceof Error ? e.message : "Invalid image."); }

  const id = randomUUID();
  const key = `listings/${productId}/${id}.webp`;
  await getStore().put(key, processed.data, processed.contentType);
  // Retry if two uploads race for the same position (unique on productId+position).
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const last = await db().productImage.aggregate({ where: { productId }, _max: { position: true } });
      const position = (last._max.position ?? -1) + 1;
      if (position >= MAX_IMAGES) break;
      const row = await db().productImage.create({ data: { id, productId, url: `/api/images/${id}`, publicId: key, position, alt: alt?.slice(0, 160) || owned.title } });
      return { ok: true, value: { id: row.id, url: row.url } };
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) { await getStore().delete(key).catch(() => undefined); throw e; }
    }
  }
  await getStore().delete(key).catch(() => undefined);
  return fail("conflict", "Another upload was in progress. Please try again.");
}

export async function deleteListingImage(actor: Actor, productId: string, imageId: string): Promise<ServiceResult<null>> {
  const img = await db().productImage.findFirst({ where: { id: imageId, productId, product: { sellerId: actor.id } }, select: { id: true, publicId: true } });
  if (!img) return fail("not_found", "Photo not found.");
  const prod = await db().product.findUnique({ where: { id: productId }, select: { status: true, _count: { select: { images: true } } } });
  if (prod?.status === "ACTIVE" && prod._count.images <= 1) return fail("conflict", "A live listing needs at least one photo. Pause it first or add another photo.");
  await db().productImage.delete({ where: { id: img.id } });
  await getStore().delete(img.publicId).catch(() => undefined);
  return { ok: true, value: null };
}

/** For the image route: may this viewer see this image? Public for live/sold listings, owner/admin otherwise. */
export async function findImageForViewer(imageId: string, viewer: { id: string; role: string } | null) {
  const img = await db().productImage.findUnique({ where: { id: imageId }, select: { publicId: true, product: { select: { sellerId: true, status: true, seller: { select: { status: true } } } } } });
  if (!img) return null;
  const { product } = img;
  const isPublic = (product.status === "ACTIVE" || product.status === "SOLD") && product.seller.status === "ACTIVE";
  const privileged = !!viewer && (viewer.id === product.sellerId || viewer.role === "ADMIN");
  if (!isPublic && !privileged) return null;
  return { key: img.publicId, isPublic };
}
