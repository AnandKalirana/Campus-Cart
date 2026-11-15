import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface ObjectStore {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

export class StorageUnavailable extends Error {}

const KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,200}$/;
function assertKey(key: string) {
  // Keys are generated server-side, but guard anyway: no traversal, no absolute paths.
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) throw new Error("invalid storage key");
}

/** S3-compatible store. On Neon: AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY come from `neon env pull`. */
export function s3Store(opts: { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string }): ObjectStore {
  const client = new S3Client({
    endpoint: opts.endpoint, region: opts.region, forcePathStyle: true, // Neon storage: path-style + SigV4 only
    credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    requestHandler: { requestTimeout: 10_000, connectionTimeout: 5_000 },
    maxAttempts: 2,
  });
  return {
    async put(key, data, contentType) {
      assertKey(key);
      await client.send(new PutObjectCommand({ Bucket: opts.bucket, Key: key, Body: data, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
    },
    async get(key) {
      assertKey(key);
      try {
        const r = await client.send(new GetObjectCommand({ Bucket: opts.bucket, Key: key }));
        if (!r.Body) return null;
        return { data: Buffer.from(await r.Body.transformToByteArray()), contentType: r.ContentType ?? "application/octet-stream" };
      } catch (e) {
        if ((e as { name?: string }).name === "NoSuchKey") return null;
        throw e;
      }
    },
    async delete(key) { assertKey(key); await client.send(new DeleteObjectCommand({ Bucket: opts.bucket, Key: key })); },
  };
}

/** Dev-only fallback so the app works without Neon credentials. Never used in production. */
export function fsStore(root: string): ObjectStore {
  const file = (key: string) => { assertKey(key); return path.join(root, key); };
  return {
    async put(key, data) { const f = file(key); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data); },
    async get(key) { try { return { data: await fs.readFile(file(key)), contentType: "image/webp" }; } catch { return null; } },
    async delete(key) { await fs.rm(file(key), { force: true }); },
  };
}

export function memoryStore(): ObjectStore & { size(): number } {
  const m = new Map<string, { data: Buffer; contentType: string }>();
  return {
    async put(key, data, contentType) { assertKey(key); m.set(key, { data, contentType }); },
    async get(key) { assertKey(key); return m.get(key) ?? null; },
    async delete(key) { assertKey(key); m.delete(key); },
    size: () => m.size,
  };
}

let cached: ObjectStore | undefined;
/** Test seam: inject an in-memory store. */
export function __setStoreForTests(s: ObjectStore | undefined) { cached = s; }
export function getStore(): ObjectStore {
  if (cached) return cached;
  const e = process.env;
  if (e.STORAGE_DRIVER === "local" || (!e.AWS_ENDPOINT_URL_S3 && e.NODE_ENV !== "production")) {
    // Local disk: development and CI only. Ephemeral/serverless hosts lose these files, so production must use S3 storage.
    cached = fsStore(path.join(process.cwd(), ".data", "uploads"));
  } else if (e.AWS_ENDPOINT_URL_S3 && e.AWS_ACCESS_KEY_ID && e.AWS_SECRET_ACCESS_KEY) {
    cached = s3Store({ endpoint: e.AWS_ENDPOINT_URL_S3, region: e.AWS_REGION ?? "us-east-2", bucket: e.STORAGE_BUCKET ?? "assets", accessKeyId: e.AWS_ACCESS_KEY_ID, secretAccessKey: e.AWS_SECRET_ACCESS_KEY });
  } else {
    throw new StorageUnavailable("Object storage is not configured");
  }
  return cached;
}
