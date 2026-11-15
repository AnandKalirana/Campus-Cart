import { getCurrentUser } from "@/lib/session";
import { findImageForViewer } from "@/services/listing-service";
import { getStore } from "@/lib/storage";
import { idSchema } from "@/lib/validation/listing";
import { log, requestId } from "@/lib/log";

// GET /api/images/:id  (public for live/sold listings; owner/admin only otherwise)
// Photos live in a private bucket and are streamed through here, so access follows listing visibility.
const HEADERS = { "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox" };
const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success && !/^[0-9a-f-]{36}$/i.test(id)) return notFound();
  try {
    let hit = await findImageForViewer(id, null);
    let isPublic = !!hit;
    if (!hit) {
      const user = await getCurrentUser();
      hit = user ? await findImageForViewer(id, user) : null;
      isPublic = false;
    }
    if (!hit) return notFound();
    const obj = await getStore().get(hit.key);
    if (!obj) return notFound();
    return new Response(new Uint8Array(obj.data), {
      headers: { ...HEADERS, "content-type": "image/webp", "cache-control": isPublic ? "public, max-age=3600" : "private, no-store" },
    });
  } catch (e) {
    log("error", "image_serve_failed", { rid: requestId(), name: e instanceof Error ? e.name : "unknown" });
    return new Response("Unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
}
