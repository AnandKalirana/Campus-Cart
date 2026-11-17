import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MAX_LISTINGS = 2000;

// Public pages plus active listings from active sellers. Private areas and removed/paused/sold listings are never listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ["", "/marketplace", "/how-it-works", "/safety", "/help", "/privacy", "/terms", "/cookies"].map(p => ({ url: `${base}${p}` }));
  const rows = await db().product.findMany({
    where: { status: "ACTIVE", seller: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" }, take: MAX_LISTINGS, select: { id: true, updatedAt: true },
  }).catch(() => []);
  return [...fixed, ...rows.map(r => ({ url: `${base}/products/${r.id}`, lastModified: r.updatedAt }))];
}
