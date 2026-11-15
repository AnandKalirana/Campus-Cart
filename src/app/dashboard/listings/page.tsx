import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/products/product-card";
import { requireUser } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/listing-format";
import { listOwnListings } from "@/services/listing-service";

export const metadata: Metadata = { title: "My listings", robots: { index: false } };

async function Mine() {
  const user = await requireUser("/dashboard/listings");
  const items = await listOwnListings(user.id);
  if (!items.length) return (
    <div className="bru-card p-8"><p className="font-raw text-2xl">No listings yet.</p><Link href="/sell" className="bru-btn mt-6 h-12 bg-cc-orange px-6 text-base">Sell something</Link></div>
  );
  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-14 min-[560px]:grid-cols-2 lg:grid-cols-4">
      {items.map(p => (
        <li key={p.id}>
          <ProductCard product={p} headingLevel={2} />
          <p className="mt-3 flex items-center gap-3">
            <span className="font-raw border-2 border-black bg-white px-2 py-0.5 text-xs">{STATUS_LABEL[p.status]}</span>
            <Link href={`/sell/${p.id}/edit`} className="font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">Edit</Link>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-24 pt-12 lg:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-raw text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">My listings</h1>
        <Link href="/sell" className="bru-btn h-12 bg-cc-orange px-6 text-base">New listing</Link>
      </div>
      <Suspense fallback={<div className="h-64" aria-busy="true" />}><Mine /></Suspense>
    </section>
  );
}
