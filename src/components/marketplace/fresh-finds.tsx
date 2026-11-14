"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CONDITIONS, DEMO_PRODUCTS } from "@/lib/catalog";
import { ProductCard } from "@/components/products/product-card";

export function FreshFinds() {
  const [cond, setCond] = useState<(typeof CONDITIONS)[number]>("All conditions");
  const items = DEMO_PRODUCTS.filter(p => cond === "All conditions" || p.condition === cond);
  return (
    <section aria-labelledby="fresh-title" className="mx-auto mt-20 max-w-[1400px] px-5 lg:mt-28 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="fresh-title" className="font-raw text-[clamp(2.25rem,6.5vw,4.5rem)] italic">Fresh finds. Fair prices.</h2>
          <p className="mt-3 text-xl font-bold">Pre-loved essentials. Ready for their next chapter.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <label htmlFor="cond" className="sr-only">Filter by condition</label>
            <select id="cond" value={cond} onChange={e => setCond(e.target.value as typeof cond)}
              className="bru-btn h-14 cursor-pointer appearance-none bg-white pl-5 pr-12 text-base">
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" aria-hidden />
          </div>
          <Link href="/marketplace" className="bru-btn h-14 bg-black px-8 text-xl text-white">View all <ArrowRight size={20} aria-hidden /></Link>
        </div>
      </div>
      {items.length ? (
        <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-14 min-[560px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
          {items.map((p, i) => <li key={p.id} className={i % 2 ? "lg:mt-16" : ""}><ProductCard product={p} /></li>)}
        </ul>
      ) : (
        <p className="bru-card mt-10 p-8 text-center text-lg font-bold">No finds in that condition yet. Try another filter.</p>
      )}
      <p className="mt-10 border-l-8 border-black pl-4 text-sm font-bold">Sample listings shown for design preview. They are not real inventory.</p>
    </section>
  );
}
