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
    <section aria-labelledby="fresh-title" className="mx-auto mt-14 max-w-[1312px] px-5 lg:px-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="fresh-title" className="text-[32px] font-semibold tracking-[-0.03em]">Fresh finds. Fair prices.</h2>
          <p className="mt-2 text-[15px] text-cc-muted">Pre-loved essentials. Ready for their next chapter.</p>
        </div>
        <div className="flex items-center gap-8">
          <div className="relative">
            <label htmlFor="cond" className="sr-only">Filter by condition</label>
            <select id="cond" value={cond} onChange={e => setCond(e.target.value as typeof cond)}
              className="h-11 appearance-none rounded-full bg-cc-surface py-0 pl-5 pr-11 text-[13px] font-medium outline-none hover:bg-[#eaecf1]">
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cc-muted" aria-hidden />
          </div>
          <Link href="/marketplace" className="flex items-center gap-8 text-[15px] font-medium text-cc-blue hover:underline">View all <ArrowRight size={18} aria-hidden /></Link>
        </div>
      </div>
      {items.length ? (
        <ul className="mt-8 grid grid-cols-1 gap-x-4 gap-y-10 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {items.map(p => <li key={p.id}><ProductCard product={p} /></li>)}
        </ul>
      ) : (
        <p className="mt-10 rounded-2xl bg-cc-surface p-8 text-center text-sm text-cc-muted">No finds in that condition yet. Try another filter.</p>
      )}
      <p className="mt-6 text-xs text-cc-subtle">Sample listings shown for design preview. They are not real inventory.</p>
    </section>
  );
}
