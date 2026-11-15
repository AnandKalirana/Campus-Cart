import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ListingsPanel } from "@/components/dashboard/listings-panel";
import { InboxAndPickup } from "@/components/dashboard/inbox-and-pickup";
import { SavedAndPromo } from "@/components/dashboard/saved-and-promo";
import { getDashboardData } from "@/services/dashboard-service";

export const metadata: Metadata = { title: "Your dashboard", robots: { index: false } };

// Server-side gate: anonymous visitors are redirected to log in, then returned here.
async function Body() {
  const user = await requireUser("/dashboard");
  const first = user.name.trim().split(/\s+/)[0] || "you";
  const data = await getDashboardData();

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-8 md:px-6 md:pt-14 lg:pt-16">
      <div className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="min-w-0 space-y-4">
          <p className="font-raw inline-block border-4 border-black bg-cc-sky px-3 py-1 text-xs tracking-widest md:text-sm">Your campus, connected{" // "}{new Date().getFullYear()}</p>
          <h1 className="font-raw text-4xl leading-[0.9] md:text-[clamp(3rem,7vw,6rem)]">
            Wassup, {first}.<br />
            <span className="inline-block bg-cc-red px-3 text-white">Bag secured?</span>
          </h1>
        </div>
        <Link href="/marketplace" className="bru-btn tilt-2 min-h-12 w-full bg-white px-6 py-3 text-base md:h-16 md:w-auto md:px-10 md:text-xl">Browse marketplace</Link>
      </div>
      <DashboardTabs />
      <StatCards stats={data.stats} />
      <div className="mb-12 grid grid-cols-[minmax(0,1fr)] gap-10 md:mb-20 lg:grid-cols-3 lg:gap-16">
        <ListingsPanel listings={data.listings} />
        <InboxAndPickup conversations={data.listings} />
      </div>
      <SavedAndPromo stats={data.stats} />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="h-96" aria-busy="true" />}><Body /></Suspense>;
}
