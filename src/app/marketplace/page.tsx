import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ProductCard } from "@/components/products/product-card";
import { FilterForm } from "@/components/marketplace/filter-form";
import { parseSearchParams, type SearchParams } from "@/lib/validation/listing";
import { listCategoriesAndCampuses, searchListings } from "@/services/listing-service";
import { PAGE_SIZE } from "@/lib/listing-format";
import { getCurrentUser } from "@/lib/session";
import { savedIdsFor } from "@/services/wishlist-service";
import { CAMPUS_COOKIE, effectiveCampus } from "@/lib/campus-cookie";
import { DEFAULT_CAMPUS_SLUG } from "@/lib/catalog";

export const metadata: Metadata = { title: "Marketplace", description: "Browse student listings from your campus. No account needed to look around." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function pageHref(p: SearchParams, page: number) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ q: p.q, category: p.category, campus: p.campus, condition: p.condition, min: p.min, max: p.max, sort: p.sort !== "newest" ? p.sort : undefined, page: page > 1 ? page : undefined }))
    if (v !== undefined && v !== "") u.set(k, String(v));
  const qs = u.toString();
  return qs ? `/marketplace?${qs}` : "/marketplace";
}

async function Results({ searchParams }: Props) {
  let p = parseSearchParams(await searchParams);
  const user = await getCurrentUser();
  let data;
  try {
    const meta = await listCategoriesAndCampuses();
    // The header's campus picker is a cookie, so it applies here on the server. ?campus= in the URL wins; "all" means every campus.
    const campus = effectiveCampus(p.campus, (await cookies()).get(CAMPUS_COOKIE)?.value, meta.campuses.map(c => c.slug), DEFAULT_CAMPUS_SLUG);
    p = { ...p, campus: campus ?? "all" };
    data = { meta, res: await searchListings(p) };
  } catch {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-16"><p role="alert" className="bru-card p-8 text-xl font-bold">We couldn&apos;t load listings right now. Please try again in a moment.</p></div>
    );
  }
  const { meta, res } = data;
  const saved = await savedIdsFor(user?.id, res.items.map(i => i.id)).catch(() => new Set<string>());
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-12 lg:px-6">
      <h1 className="font-raw text-[clamp(2.5rem,7vw,5rem)] leading-[0.9]">Find your <span className="underline decoration-8 underline-offset-8">next find</span></h1>
      <div className="mt-8">{/* remount on change: the fields are uncontrolled, so a soft navigation (campus picker) would otherwise leave them showing old values */}<FilterForm key={JSON.stringify([p.q, p.category, p.campus, p.condition, p.min, p.max, p.sort])} p={p} categories={meta.categories} campuses={meta.campuses} /></div>
      <p className="mt-8 text-lg font-bold" role="status" aria-live="polite">
        {res.total === 0 ? "No listings match." : `${res.total} listing${res.total === 1 ? "" : "s"}${p.q ? ` for “${p.q}”` : ""}`}
        {res.pages > 1 && ` · page ${res.page} of ${res.pages}`}
      </p>
      {res.items.length ? (
        <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-14 min-[560px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
          {res.items.map(item => <li key={item.id}><ProductCard product={item} headingLevel={2} signedIn={!!user} initialSaved={saved.has(item.id)} /></li>)}
        </ul>
      ) : (
        <div className="bru-card mt-8 p-8">
          <p className="font-raw text-2xl">Nothing here yet.</p>
          <p className="mt-2 text-lg font-bold">Try fewer filters, or be the first to list something.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/marketplace" className="bru-btn h-12 bg-white px-6 text-base">Clear filters</Link>
            <Link href="/sell" className="bru-btn h-12 bg-cc-orange px-6 text-base">Sell something</Link>
          </div>
        </div>
      )}
      {res.pages > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-between gap-4">
          {res.page > 1 ? <Link href={pageHref(p, res.page - 1)} rel="prev" className="bru-btn h-12 bg-white px-6 text-base">Previous</Link> : <span />}
          <span className="text-sm font-bold">{PAGE_SIZE} per page</span>
          {res.page < res.pages ? <Link href={pageHref(p, res.page + 1)} rel="next" className="bru-btn h-12 bg-black px-6 text-base text-white">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}

export default function MarketplacePage(props: Props) {
  return <Suspense fallback={<div className="mx-auto h-96 max-w-[1400px] px-5 py-24" aria-busy="true" />}><Results {...props} /></Suspense>;
}
