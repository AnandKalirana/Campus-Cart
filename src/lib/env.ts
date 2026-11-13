import "server-only";
import { z } from "zod";

// Validated once at first use. Secrets live here only and are never exposed to the client.
const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Log field names only. Never log values, they may be secrets.
    const fields = parsed.error.issues.map(i => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}
