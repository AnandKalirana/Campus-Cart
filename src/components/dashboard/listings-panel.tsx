"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Resp } from "@/components/ui/resp";
import { formatINR } from "@/lib/catalog";
import { SAMPLE_LISTINGS, type ListingStatus } from "@/lib/dashboard-demo";

const TABS: { key: ListingStatus; label: string }[] = [{ key: "active", label: "Active" }, { key: "draft", label: "Drafts" }, { key: "sold", label: "Sold" }];
const BADGE: Record<ListingStatus, string> = { active: "bg-cc-green", draft: "bg-cc-yellow", sold: "bg-white" };

export function ListingsPanel() {
  const [tab, setTab] = useState<ListingStatus>("active");
  const counts = Object.fromEntries(TABS.map(t => [t.key, SAMPLE_LISTINGS.filter(l => l.status === t.key).length])) as Record<ListingStatus, number>;
  const rows = SAMPLE_LISTINGS.filter(l => l.status === tab);
  return (
    <section aria-labelledby="listings-title" className="min-w-0 lg:col-span-2">
      <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
        <h2 id="listings-title" className="font-raw text-2xl md:text-5xl">Your listings</h2>
        <Link href="/sell" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white md:text-base md:decoration-4"><Resp mobile="View all" desktop={`View all ${counts.active}`} /></Link>
      </div>
      <div role="group" aria-label="Filter listings by status" className="mb-4 flex gap-2 md:mb-8 md:gap-4">
        {TABS.map(t => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${tab === t.key ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>
      <ul className="space-y-4 md:hidden">
        {rows.map(l => (
          <li key={l.id} className="bru-card flex gap-4 p-4">
            <Image src={l.image} alt={l.alt} width={80} height={80} className="h-20 w-20 flex-shrink-0 border-2 border-black object-cover" />
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="text-base font-bold leading-tight">{l.title}</p>
                <p className="text-[11px] font-bold uppercase text-cc-muted">{l.category}{" // "}{formatINR(l.price)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase">{l.views} views</span>
                <span className={`border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase ${BADGE[l.status]}`}>{l.status}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="bru-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto" role="region" aria-label="Your listings table, scrolls sideways on small screens" tabIndex={0}>
          <table className="w-full min-w-[620px] text-left">
            <caption className="sr-only">Your {tab} listings (sample data)</caption>
            <thead className="bg-black font-raw text-xs text-white">
              <tr><th scope="col" className="p-4">Item</th><th scope="col" className="p-4">Price</th><th scope="col" className="p-4">Stats</th><th scope="col" className="p-4 text-right">Status</th></tr>
            </thead>
            <tbody className="divide-y-4 divide-black font-bold">
              {rows.map(l => (
                <tr key={l.id}>
                  <td className="flex items-center gap-4 p-4">
                    <Image src={l.image} alt={l.alt} width={64} height={64} className="h-16 w-16 flex-shrink-0 border-2 border-black object-cover" />
                    <span><span className="block text-lg leading-tight">{l.title}</span><span className="text-xs text-cc-muted">{l.category}{" // "}{l.age}</span></span>
                  </td>
                  <td className="font-raw p-4 text-2xl">{formatINR(l.price)}</td>
                  <td className="p-4 text-xs uppercase">{l.views} views{" // "}{l.saves} saves</td>
                  <td className="p-4 text-right"><span className={`inline-block border-2 border-black px-3 py-1 text-xs uppercase ${BADGE[l.status]}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 border-4 border-black bg-white p-3 md:mt-6 md:p-4">
        <p className="text-[11px] font-bold uppercase md:text-xs">{counts.draft} draft waiting for <Resp mobile="you..." desktop="your energy..." /></p>
        <button type="button" onClick={() => setTab("draft")} className="font-raw text-[11px] underline hover:bg-black hover:text-white md:text-xs"><Resp mobile="Finish it" desktop="Finish listing" /></button>
      </div>
    </section>
  );
}
