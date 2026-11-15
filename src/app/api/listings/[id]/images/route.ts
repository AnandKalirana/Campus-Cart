import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { addListingImage } from "@/services/listing-service";
import { idSchema } from "@/lib/validation/listing";
import { MAX_UPLOAD_BYTES } from "@/lib/listing-format";
import { imageUploadLimiter, isSameOrigin } from "@/lib/request-guards";
import { StorageUnavailable } from "@/lib/storage";
import { log, requestId } from "@/lib/log";

// POST /api/listings/:id/images
// Auth: required. Authz: listing owner only. Body: multipart/form-data with one `file`.
// Limits: 8 MB raw, 5 photos per listing, 40 uploads / 10 min / user.
// Errors: 400 bad input, 401, 403 cross-origin, 404 (not found or not yours), 409, 413, 422 bad image, 429, 503 storage down.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rid = requestId();
  const json = (body: object, status: number, headers?: Record<string, string>) => NextResponse.json(body, { status, headers: { "x-request-id": rid, "cache-control": "no-store", ...headers } });
  try {
    if (!isSameOrigin(req)) return json({ error: "Request blocked." }, 403);
    const user = await getCurrentUser();
    if (!user) return json({ error: "Please log in again." }, 401);
    const { id } = await ctx.params;
    if (!idSchema.safeParse(id).success) return json({ error: "Listing not found." }, 404);

    const rl = imageUploadLimiter.check(user.id);
    if (!rl.ok) return json({ error: "Too many uploads. Please wait a bit." }, 429, { "retry-after": String(rl.retryAfterSec) });

    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: "That photo is too large (max 8 MB)." }, 413);

    let form: FormData;
    try { form = await req.formData(); } catch { return json({ error: "Invalid upload." }, 400); }
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose a photo to upload." }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return json({ error: "That photo is too large (max 8 MB)." }, 413);

    const r = await addListingImage(user, id, Buffer.from(await file.arrayBuffer()));
    if (r.ok) return json({ id: r.value.id, url: r.value.url }, 201);
    const status = { not_found: 404, forbidden: 403, invalid: 422, limit: 409, conflict: 409 }[r.code];
    return json({ error: r.message }, status);
  } catch (e) {
    log("error", "image_upload_failed", { rid, kind: e instanceof StorageUnavailable ? "storage_unavailable" : "unexpected", name: e instanceof Error ? e.name : "unknown" });
    return json({ error: "We couldn't upload that photo. Please try again." }, e instanceof StorageUnavailable ? 503 : 500);
  }
}
