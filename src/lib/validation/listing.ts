import { z } from "zod";
import { CONDITION_VALUES, SORT_VALUES } from "@/lib/listing-format";

// Strip control characters (keeps \n and \t) so pasted junk can't reach the DB or logs.
// React escapes on render, so no HTML is stored or rendered raw anywhere.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const text = (min: number, max: number, what: string) =>
  z.string().transform(clean).pipe(z.string().min(min, `${what} is too short.`).max(max, `${what} is too long (max ${max}).`));

export const MAX_PRICE = 1_000_000; // whole rupees. Sanity cap, not a business rule.

const rupees = (what: string) =>
  z.coerce.number({ error: `Enter a ${what}.` }).int(`${what} must be a whole number of rupees.`).min(1, `${what} must be at least ₹1.`).max(MAX_PRICE, `${what} can't exceed ₹${MAX_PRICE.toLocaleString("en-IN")}.`);

export const listingInputSchema = z
  .object({
    title: text(3, 120, "Title"),
    description: text(10, 2000, "Description"),
    categorySlug: z.string().min(1, "Choose a category.").max(40),
    condition: z.enum(CONDITION_VALUES, { error: "Choose a condition." }),
    price: rupees("price"),
    // Empty string from an untouched form field means "not provided".
    originalPrice: z.preprocess(v => (v === "" || v == null ? undefined : v), rupees("original price").optional()),
    pickupLocation: text(3, 160, "Pickup spot"),
  })
  .refine(v => v.originalPrice === undefined || v.originalPrice >= v.price, { path: ["originalPrice"], message: "Original price can't be lower than your price." });

export type ListingInput = z.infer<typeof listingInputSchema>;

const cuidLike = z.string().regex(/^[a-z0-9]{20,32}$/i, "Invalid id.");
export const idSchema = cuidLike;

export const searchParamsSchema = z.object({
  q: z.string().transform(clean).pipe(z.string().max(80)).optional().catch(undefined),
  category: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  campus: z.string().regex(/^[a-z0-9-]{1,60}$/).optional().catch(undefined),
  condition: z.enum(CONDITION_VALUES).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(MAX_PRICE).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(MAX_PRICE).optional().catch(undefined),
  sort: z.enum(SORT_VALUES).default("newest").catch("newest"),
  page: z.coerce.number().int().min(1).max(200).default(1).catch(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

/** Next gives string | string[] | undefined per key. Take the first value, then validate. Never throws. */
export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchParams {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;
  for (const k of ["q", "category", "campus", "condition", "min", "max"]) if (flat[k] === "") delete flat[k];
  return searchParamsSchema.parse(flat);
}
