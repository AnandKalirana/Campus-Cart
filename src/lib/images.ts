import "server-only";
import sharp from "sharp";
import { MAX_UPLOAD_BYTES } from "@/lib/listing-format";

export class ImageRejected extends Error {
  constructor(public readonly reason: string) { super(reason); }
}

const ALLOWED = new Set(["jpeg", "png", "webp"]);
const MAX_DIMENSION = 1600;
const MAX_INPUT_PIXELS = 40_000_000; // decompression-bomb guard

export interface ProcessedImage { data: Buffer; width: number; height: number; contentType: "image/webp" }

/**
 * Never trust filename, extension or the client's Content-Type. We decode the bytes ourselves:
 * the format must be one of JPEG/PNG/WebP as detected from the content, and the image is then
 * re-encoded to WebP. Re-encoding drops EXIF (including GPS location from phone photos),
 * applies orientation, caps dimensions and removes anything appended to the file.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageRejected("The file is empty.");
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageRejected("That photo is too large (max 8 MB).");
  try {
    const probe = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
    const meta = await probe.metadata();
    if (!meta.format || !ALLOWED.has(meta.format)) throw new ImageRejected("Use a JPEG, PNG or WebP photo.");
    if ((meta.pages ?? 1) > 1) throw new ImageRejected("Animated images aren't supported.");
    if (!meta.width || !meta.height || meta.width < 100 || meta.height < 100) throw new ImageRejected("That photo is too small (min 100×100).");
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, contentType: "image/webp" };
  } catch (e) {
    if (e instanceof ImageRejected) throw e;
    throw new ImageRejected("We couldn't read that image. Try a different photo.");
  }
}
