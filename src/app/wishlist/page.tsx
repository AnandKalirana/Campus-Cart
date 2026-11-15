import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { requireUser } from "@/lib/session";
import { Heart, ArrowRight, Plus } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import { Resp } from "@/components/ui/resp";
import { getSavedItems } from "@/services/dashboard-service";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

async function SavedItems() {
  await requireUser("/wishlist");
  const items = await getSavedItems();

  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-12">
      <header className="mb-10">
        <p className="font-raw inline-block border-4 border-black bg-cc-sky px-3 py-1 text-xs tracking-widest md:text-sm">Saved items</p>
        <h1 className="font-raw mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]"><Resp mobile="Still thinking?" desktop="Still on your mind?" /></h1>
        <p className="mt-2 text-lg font-bold">{items.length} item{items.length === 1 ? "" : "s"} saved</p>
      </header>

      {items.length === 0 ? (
        <div className="bru-card p-12 text-center">
          <Heart className="mx-auto h-16 w-16 text-cc-muted mb-4" aria-hidden />
          <p className="font-raw text-2xl mb-2">Nothing saved yet</p>
          <p className="text-lg font-bold text-cc-muted mb-6 max-w-md mx-auto">Find something you like? Tap the heart on any listing to save it for later.</p>
          <Link href="/marketplace" className="bru-btn h-12 bg-black px-6 text-base inline-flex text-white">Browse marketplace</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(item => (
            <li key={item.id}>
              <Link href={`/products/${item.id}`} className="bru-card bru-card-lift group block overflow-hidden">
                <div className="relative h-48 border-b-4 border-black bg-white md:h-56">
                  <Image src={item.image ?? "/images/demo/laptop.svg"} alt={item.imageAlt} fill sizes="(min-width:1024px) 25vw, 100vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="font-raw absolute left-3 top-3 border-2 border-black bg-white px-2 py-0.5 text-[10px]">{item.condition}</span>
                  <span role="img" aria-label="Saved" className="absolute right-3 top-3 grid h-10 w-10 place-items-center border-2 border-black bg-cc-red text-white"><Heart size={20} fill="currentColor" aria-hidden /></span>
                </div>
                <div className="p-6">
                  <p className="font-raw mb-2 inline-block border-2 border-black bg-cc-yellow px-2 text-[10px]">{item.categoryName}</p>
                  <h3 className="font-raw text-xl leading-tight group-hover:underline">{item.title}</h3>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <p className="flex items-baseline gap-2">
                      <span className="font-raw text-2xl">{formatINR(item.price)}</span>
                      {item.originalPrice && <s className="text-xs font-bold text-[#525252]">{formatINR(item.originalPrice)}</s>}
                    </p>
                    <span className="text-[10px] font-bold uppercase">{item.campusName}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
  return <Suspense fallback={<div className="h-64" aria-busy="true" />}><SavedItems /></Suspense>;
}
