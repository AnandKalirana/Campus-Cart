"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { FormState, GENERIC_ERROR, TOO_MANY, fieldErrors } from "@/lib/auth/actions-helpers";
import { idSchema, listingInputSchema } from "@/lib/validation/listing";
import { changeListingStatus, createListing, deleteListingImage, updateListing } from "@/services/listing-service";
import { createListingLimiter, mutateListingLimiter } from "@/lib/request-guards";
import { log } from "@/lib/log";

// Every action: authenticates on the server, validates with Zod on the server, authorizes via the
// service layer (ownership is in the query), and returns safe messages only.
export type ListingState = FormState & { id?: string };

const UNAUTH: ListingState = { message: "Your session has expired. Please log in again." };
const pick = (fd: FormData) => Object.fromEntries(["title", "description", "categorySlug", "condition", "price", "originalPrice", "pickupLocation"].map(k => [k, String(fd.get(k) ?? "")]));

export async function createListingAction(_prev: ListingState | undefined, fd: FormData): Promise<ListingState> {
  const user = await getCurrentUser();
  if (!user) return UNAUTH;
  const raw = pick(fd);
  const parsed = listingInputSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values: raw };
  if (!createListingLimiter.check(user.id).ok) return { ...TOO_MANY, values: raw };
  try {
    const r = await createListing(user, parsed.data);
    if (!r.ok) return r.field ? { errors: { [r.field]: r.message }, values: raw } : { message: r.message, values: raw };
    log("info", "listing_created", { listingId: r.value.id, userId: user.id });
    return { ok: true, id: r.value.id };
  } catch (e) {
    log("error", "listing_create_failed", { userId: user.id, name: e instanceof Error ? e.name : "unknown" });
    return { ...GENERIC_ERROR, values: raw };
  }
}

export async function updateListingAction(id: string, _prev: ListingState | undefined, fd: FormData): Promise<ListingState> {
  const user = await getCurrentUser();
  if (!user) return UNAUTH;
  if (!idSchema.safeParse(id).success) return { message: "Listing not found." };
  const raw = pick(fd);
  const parsed = listingInputSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values: raw };
  if (!mutateListingLimiter.check(user.id).ok) return { ...TOO_MANY, values: raw };
  try {
    const r = await updateListing(user, id, parsed.data);
    if (!r.ok) return r.field ? { errors: { [r.field]: r.message }, values: raw } : { message: r.message, values: raw };
    revalidatePath(`/products/${id}`);
    return { ok: true, id, message: "Saved.", values: raw };
  } catch (e) {
    log("error", "listing_update_failed", { listingId: id, userId: user.id, name: e instanceof Error ? e.name : "unknown" });
    return { ...GENERIC_ERROR, values: raw };
  }
}

export async function listingStatusAction(id: string, action: "publish" | "pause" | "sold" | "remove"): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: UNAUTH.message };
  if (!idSchema.safeParse(id).success || !["publish", "pause", "sold", "remove"].includes(action)) return { ok: false, message: "Listing not found." };
  if (!mutateListingLimiter.check(user.id).ok) return { ok: false, message: TOO_MANY.message };
  try {
    const r = await changeListingStatus(user, id, action);
    if (!r.ok) return { ok: false, message: r.message };
    log("info", "listing_status_changed", { listingId: id, userId: user.id, action });
    revalidatePath(`/products/${id}`); revalidatePath("/marketplace"); revalidatePath("/");
    return { ok: true };
  } catch (e) {
    log("error", "listing_status_failed", { listingId: id, userId: user.id, name: e instanceof Error ? e.name : "unknown" });
    return { ok: false, message: GENERIC_ERROR.message };
  }
}

export async function deleteImageAction(productId: string, imageId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: UNAUTH.message };
  if (!idSchema.safeParse(productId).success || !/^[0-9a-f-]{36}$/i.test(imageId)) return { ok: false, message: "Photo not found." };
  if (!mutateListingLimiter.check(user.id).ok) return { ok: false, message: TOO_MANY.message };
  try {
    const r = await deleteListingImage(user, productId, imageId);
    if (!r.ok) return { ok: false, message: r.message };
    revalidatePath(`/products/${productId}`);
    return { ok: true };
  } catch (e) {
    log("error", "image_delete_failed", { listingId: productId, userId: user.id, name: e instanceof Error ? e.name : "unknown" });
    return { ok: false, message: GENERIC_ERROR.message };
  }
}
