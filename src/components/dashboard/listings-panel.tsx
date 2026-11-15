"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Resp } from "@/components/ui/resp";
import { formatINR } from "@/lib/catalog";
import type { ListingCardData } from "@/services/listing-service";

type ListingStatus = "active" | "draft" | "sold";

const TABS: { key: ListingStatus; label: string }[] = [{ key: "active", label: "Active" }, { key: "draft", label: "Drafts" }, { key: "sold", label: "Sold" }];
const BADGE: Record<ListingStatus, string> = { active: "bg-cc-green", draft: "bg-cc-yellow", sold: "bg-white" };

interface ListingsPanelProps {
  listings: {
    active: ListingCardData[];
    draft: ListingCardData[];
    sold: ListingCardData[];
  };
}

export function ListingsPanel({ listings }: ListingsPanelProps) {
  const [tab, setTab] = useState<ListingStatus>("active");

  const activeCount = listings.active.length;
  const draftCount = listings.draft.length;
  const counts = { active: activeCount, draft: draftCount, sold: listings.sold.length };

  const rows = listings[tab];

  return (
    <section aria-labelledby="listings-title" className="min-w-0 lg:col-span-2">
      <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
        <h2 id="listings-title" className="font-raw text-2xl md:text-5xl">Your listings</h2>
        <Link href="/sell" className="text-xs font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white md:text-base md:decoration-4"><Resp mobile="View all" desktop={`View all ${activeCount}`} /></Link>
      </div>
      <div role="group" aria-label="Filter listings by status" className="mb-4 flex gap-2 md:mb-8 md:gap-4">
        {TABS.map(t => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[11px] font-bold uppercase transition-colors md:px-4 md:text-xs ${tab === t.key ? "bg-black text-white" : "border-2 border-black bg-white hover:bg-cc-yellow"}`}>
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bru-card p-8 text-center">
          <p className="font-raw text-xl mb-2">
            {tab === "active" ? "No active listings yet" : tab === "draft" ? "No drafts" : "Nothing sold yet"}
          </p>
          <p className="text-lg font-bold text-cc-muted mb-4">
            {tab === "active" ? "Publish a draft or create a new listing to see it here." : tab === "draft" ? "Start a new listing and it'll appear here as a draft." : "When you mark a listing as sold, it'll show up here."}
          </p>
          {tab !== "sold" && (
            <Link href="/sell" className="bru-btn h-12 bg-cc-orange px-6 text-base inline-flex">Create listing</Link>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-4 md:hidden">
            {rows.map(l => (
              <li key={l.id} className="bru-card flex gap-4 p-4">
                <Image src={l.image ?? "/images/demo/laptop.svg"} alt={l.imageAlt} width={80} height={80} className="h-20 w-20 flex-shrink-0 border-2 border-black object-cover" />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="text-base font-bold leading-tight">{l.title}</p>
                    <p className="text-[11px] font-bold uppercase text-cc-muted">{l.categoryName}{" // "}{formatINR(l.price)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase">— views</span>
                    <span className={`border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase ${BADGE[tab]}`}>{tab}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="bru-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto" role="region" aria-label="Your listings table, scrolls sideways on small screens" tabIndex={0}>
              <table className="w-full min-w-[620px] text-left">
                <caption className="sr-only">Your {tab} listings</caption>
                <thead className="bg-black font-raw text-xs text-white">
                  <tr><th scope="col" className="p-4">Item</th><th scope="col" className="p-4">Price</th><th scope="col" className="p-4">Status</th></tr>
                </thead>
                <tbody className="divide-y-4 divide-black font-bold">
                  {rows.map(l => (
                    <tr key={l.id}>
                      <td className="flex items-center gap-4 p-4">
                        <Image src={l.image ?? "/images/demo/laptop.svg"} alt={l.imageAlt} width={64} height={64} className="h-16 w-16 flex-shrink-0 border-2 border-black object-cover" />
                        <span><span className="block text-lg leading-tight">{l.title}</span><span className="text-xs text-cc-muted">{l.categoryName}</span></span>
                      </td>
                      <td className="font-raw p-4 text-2xl">{formatINR(l.price)}</td>
                      <td className="p-4 text-right"><span className={`inline-block border-2 border-black px-3 py-1 text-xs uppercase ${BADGE[tab]}`}>{tab}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {tab !== "sold" && draftCount > 0 && (
            <div className="mt-4 flex items-center justify-between gap-4 border-4 border-black bg-white p-3 md:mt-6 md:p-4">
              <p className="text-[11px] font-bold uppercase md:text-xs">{draftCount} draft waiting for <Resp mobile="you..." desktop="your energy..." /></p>
              <button type="button" onClick={() => setTab("draft")} className="font-raw text-[11px] underline hover:bg-black hover:text-white md:text-xs"><Resp mobile="Finish it" desktop="Finish listing" /></button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
