import { z } from "zod";
import { idSchema } from "@/lib/validation/listing";

// Domains that would let almost anyone verify as a student. Not a full public-suffix list: a real review of each campus domain is still needed.
const FREE_MAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "rediffmail.com", "zoho.com", "mail.com", "gmx.com"]);
const PUBLIC_SUFFIXES = new Set(["co.in", "ac.in", "edu.in", "org.in", "net.in", "gov.in", "nic.in", "res.in", "co.uk", "ac.uk", "org.uk", "edu.au", "com.au", "ac.jp", "edu.cn", "ac.nz", "edu.sg"]);
const HOST = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export type DomainCheck = { ok: true; domain: string } | { ok: false; message: string };

export function checkDomain(raw: string): DomainCheck {
  const d = raw.trim().toLowerCase().replace(/^@/, "");
  if (!d) return { ok: false, message: "Empty domain." };
  if (d.length > 100 || !HOST.test(d)) return { ok: false, message: `"${raw.trim().slice(0, 60)}" is not a valid domain (example: tcetmumbai.in).` };
  if (FREE_MAIL.has(d)) return { ok: false, message: `${d} is a public email provider; anyone could verify as this campus.` };
  if (PUBLIC_SUFFIXES.has(d)) return { ok: false, message: `${d} is shared by many institutions; use your campus's own domain.` };
  return { ok: true, domain: d };
}

/** One domain per line or comma-separated. Returns de-duplicated, validated domains or the first problem. */
export function parseDomains(input: string): { ok: true; domains: string[] } | { ok: false; message: string } {
  const parts = input.split(/[\s,;]+/).filter(Boolean);
  if (parts.length > 10) return { ok: false, message: "At most 10 domains per campus." };
  const out = new Set<string>();
  for (const p of parts) {
    const r = checkDomain(p);
    if (!r.ok) return r;
    out.add(r.domain);
  }
  return { ok: true, domains: [...out] };
}

export const slugify = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const reason = z.string().trim().min(5, "Give a short reason (at least 5 characters).").max(300, "Keep the reason under 300 characters.");
const cleanText = (min: number, max: number, label: string) => z.string().trim().min(min, `${label} is required.`).max(max, `Keep ${label.toLowerCase()} under ${max} characters.`).regex(/^[^\p{C}]+$/u, `${label} has invalid characters.`);

export const reportInputSchema = z.object({ productId: idSchema, reason: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(500, "Keep it under 500 characters.") });
export const resolveReportSchema = z.object({ reportId: idSchema, decision: z.enum(["dismiss", "remove_listing"]), reason: reason.optional() });
export const listingModerationSchema = z.object({ productId: idSchema, decision: z.enum(["remove", "restore"]), reason });
export const userModerationSchema = z.object({ userId: idSchema, decision: z.enum(["suspend", "reinstate"]), reason });
export const campusSchema = z.object({ name: cleanText(2, 80, "Name"), city: cleanText(0, 60, "City").optional().or(z.literal("")), domains: z.string().max(1200), isActive: z.boolean() });
export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  status: z.string().trim().max(20).optional(),
});

/** Never throws: junk in the query string (page=abc, q=<huge>) falls back to defaults instead of a 500. */
export function readQuery(sp: Record<string, string | undefined>): z.infer<typeof listQuerySchema> {
  const r = listQuerySchema.safeParse({ q: sp.q, page: sp.page, status: sp.status });
  if (r.success) return r.data;
  const page = listQuerySchema.shape.page.safeParse(sp.page);
  return { page: page.success ? page.data : 1 };
}
