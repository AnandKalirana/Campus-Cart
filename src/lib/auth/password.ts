import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt from Node's standard library: memory-hard, no native build, no extra dependency.
const N = 2 ** 15; // CPU/memory cost (~32 MiB at r=8)
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
const MAXMEM = 128 * 1024 * 1024;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, KEYLEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Format: scrypt$N$r$p$<salt b64>$<hash b64>. Parameters are stored so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAXMEM });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  if (![n, r, p].every(Number.isInteger) || n < 2 || n > 2 ** 20) return false;
  try {
    const expected = Buffer.from(parts[5], "base64");
    const actual = await derive(password, Buffer.from(parts[4], "base64"), { N: n, r, p, maxmem: MAXMEM });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/** Spend the same time on unknown accounts so response timing does not reveal which emails exist. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummy ??= hashPassword("campus-cart-dummy-password");
  await verifyPassword(password, await dummy);
}
