import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { Resp } from "@/components/ui/resp";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

async function MessagesPage() {
  await requireUser("/messages");

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-12">
      <header className="mb-10">
        <p className="font-raw inline-block border-4 border-black bg-cc-sky px-3 py-1 text-xs tracking-widest md:text-sm">Conversations</p>
        <h1 className="font-raw mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">The inbox</h1>
        <p className="mt-2 text-lg font-bold">Messages from buyers and sellers appear here.</p>
      </header>

      <div className="bru-card p-8 md:p-12 text-center">
        <Mail className="mx-auto h-16 w-16 text-cc-muted mb-4" aria-hidden />
        <p className="font-raw text-2xl mb-2">No messages yet</p>
        <p className="text-lg font-bold text-cc-muted mb-6 max-w-md mx-auto">When you list items or ask about listings, conversations will show up here.</p>
        <div className="flex flex-col gap-3 md:flex-row md:justify-center">
          <Link href="/marketplace" className="bru-btn h-12 bg-black px-6 text-base text-white">Browse marketplace</Link>
          <Link href="/sell" className="bru-btn h-12 bg-cc-orange px-6 text-base text-white">List something</Link>
        </div>
      </div>

      <div className="mt-12 bru-card flex flex-col overflow-hidden bg-white md:flex-row">
        <div className="flex-1 space-y-4 p-8 md:space-y-8 md:p-12">
          <div>
            <p className="font-raw mb-4 inline-block border-2 border-black bg-cc-sky px-2 py-0.5 text-[10px] tracking-widest md:text-xs"><Resp mobile="Recycle your gear" desktop="Less clutter. More life." /></p>
            <h2 className="font-raw text-3xl leading-[0.9] md:text-[clamp(2.5rem,4.5vw,3.75rem)]">Your old sh*t.<br />Their next find.</h2>
          </div>
          <p className="max-w-md text-base font-medium md:text-xl"><Resp mobile="Clear your dorm, stack some bread, keep the campus circular." desktop="Pass on what you no longer need. Clear your space, stack some bread, keep the campus moving." /></p>
          <Link href="/sell" className="bru-btn group min-h-12 w-full !whitespace-normal gap-3 bg-black px-6 py-4 text-center text-lg text-white md:min-h-16 md:w-auto md:gap-4 md:px-12 md:text-2xl"><Plus size={22} aria-hidden /> <Resp mobile="List new" desktop="List something new" /> <ArrowRight size={22} aria-hidden className="hidden transition-transform group-hover:translate-x-2 sm:block" /></Link>
        </div>
        <div className="relative hidden min-h-56 border-black bg-black md:block md:w-1/3 md:border-l-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-raw text-white/50 text-center px-4">Your next listing?</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="h-64" aria-busy="true" />}><MessagesPage /></Suspense>;
}
