import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { ImageRejected, processImage } from "@/lib/images";
import { memoryStore } from "@/lib/storage";

const make = (w: number, h: number, fmt: "jpeg" | "png" | "webp" | "gif" = "jpeg") =>
  sharp({ create: { width: w, height: h, channels: 3, background: "#ff4f00" } }).toFormat(fmt as "jpeg").toBuffer();
const rejects = async (buf: Buffer) => { await assert.rejects(() => processImage(buf), ImageRejected); };

test("accepts JPEG/PNG/WebP and outputs WebP capped at 1600px", async () => {
  for (const f of ["jpeg", "png", "webp"] as const) {
    const r = await processImage(await make(3000, 2000, f));
    assert.equal(r.contentType, "image/webp");
    assert.equal(r.width, 1600);
    assert.equal((await sharp(r.data).metadata()).format, "webp");
  }
});

test("strips EXIF including GPS", async () => {
  const withExif = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#00ff00" } })
    .withExif({ IFD0: { Copyright: "secret-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "19/1 7/1 0/1" } }).jpeg().toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, "fixture should carry EXIF");
  const out = await processImage(withExif);
  assert.equal((await sharp(out.data).metadata()).exif, undefined);
  assert.ok(!out.data.includes(Buffer.from("secret-owner")));
});

test("rejects non-images, spoofed types, empty, tiny, truncated, animated and oversized input", async () => {
  await rejects(Buffer.alloc(0));
  await rejects(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"));
  await rejects(Buffer.from("GIF89a" + "x".repeat(200))); // looks like gif, not decodable / not allowed
  await rejects(Buffer.from("#!/bin/sh\nrm -rf /\n"));
  await rejects(await make(50, 50)); // too small
  await rejects((await make(800, 600)).subarray(0, 300)); // truncated
  await rejects(await make(200, 200, "gif" as "jpeg")); // gif not on the allowlist
  await rejects(Buffer.alloc(9 * 1024 * 1024, 1)); // over 8 MB
});

test("memory store: put/get/delete, and traversal keys are refused", async () => {
  const s = memoryStore();
  await s.put("listings/a/b.webp", Buffer.from("x"), "image/webp");
  assert.equal((await s.get("listings/a/b.webp"))?.data.toString(), "x");
  await s.delete("listings/a/b.webp");
  assert.equal(await s.get("listings/a/b.webp"), null);
  for (const k of ["../etc/passwd", "/abs", "a//b", "a/../b", ""]) await assert.rejects(() => s.put(k, Buffer.from("x"), "x"));
});
