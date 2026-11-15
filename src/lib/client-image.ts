"use client";
/** Downscale a photo in the browser before upload (phone photos are often 4–10 MB). The server still re-validates and re-encodes everything. */
export async function shrinkImage(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.88));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // e.g. unsupported format: let the server give the real answer
  }
}

export async function uploadPhoto(listingId: string, file: File): Promise<{ ok: true } | { ok: false; message: string }> {
  const body = new FormData();
  body.set("file", await shrinkImage(file), "photo.jpg");
  try {
    const res = await fetch(`/api/listings/${listingId}/images`, { method: "POST", body });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: data.error ?? "We couldn't upload that photo." };
  } catch {
    return { ok: false, message: "Network problem while uploading. Check your connection and try again." };
  }
}
