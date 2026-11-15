import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Plus } from "lucide-react";
import { DEMO_PRODUCTS, formatINR } from "@/lib/catalog";
import { Resp } from "@/components/ui/resp";
import { SAMPLE_STATS } from "@/lib/dashboard-demo";

export function SavedAndPromo() {
  const p = DEMO_PRODUCTS[0];
  return (
    <section aria-labelledby="saved-title" className="mb-8">
      <div className="mb-6 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-4">
        <h2 id="saved-title" className="font-raw text-3xl md:text-6xl"><Resp mobile="Still thinking?" desktop="Still on your mind?" /></h2>
        <Link href="/wishlist" className="text-lg font-bold underline decoration-8 decoration-cc-red underline-offset-8 hover:bg-black hover:text-white md:text-xl"><Resp mobile="View all saves" desktop={`View all ${SAMPLE_STATS.saved} saved items`} /></Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Link href={`/products/${p.id}`} className="bru-card bru-card-lift group block overflow-hidden">
          <div className="relative h-48 border-b-4 border-black bg-white md:h-56">
            <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width:1024px) 25vw, 100vw" className="object-cover" />
            <span className="font-raw absolute left-3 top-3 border-2 border-black bg-white px-2 py-0.5 text-[10px]">{p.condition}</span>
            <span role="img" aria-label="Saved" className="absolute right-3 top-3 grid h-10 w-10 place-items-center border-2 border-black bg-cc-red text-white"><Heart size={20} fill="currentColor" aria-hidden /></span>
          </div>
          <div className="p-6">
            <p className="font-raw mb-2 inline-block border-2 border-black bg-cc-yellow px-2 text-[10px]">{p.categoryLabel}</p>
            <h3 className="font-raw text-xl leading-tight group-hover:underline">{p.title}</h3>
            <div className="mt-4 flex items-end justify-between gap-2">
              <p className="flex items-baseline gap-2"><span className="font-raw text-2xl">{formatINR(p.price)}</span><s className="text-xs font-bold text-[#525252]">{formatINR(p.originalPrice)}</s></p>
              <span className="text-[10px] font-bold uppercase">{p.distance}</span>
            </div>
          </div>
        </Link>
        <div className="bru-card flex flex-col overflow-hidden bg-white md:col-span-2 md:flex-row lg:col-span-3">
          <div className="flex-1 space-y-4 p-8 md:space-y-8 md:p-12">
            <div>
              <p className="font-raw mb-4 inline-block border-2 border-black bg-cc-sky px-2 py-0.5 text-[10px] tracking-widest md:text-xs"><Resp mobile="Recycle your gear" desktop="Less clutter. More life." /></p>
              <h2 className="font-raw text-3xl leading-[0.9] md:text-[clamp(2.5rem,4.5vw,3.75rem)]">Your old sh*t.<br />Their next find.</h2>
            </div>
            <p className="max-w-md text-base font-medium md:text-xl"><Resp mobile="Clear your dorm, stack some bread, keep the campus circular." desktop="Pass on what you no longer need. Clear your space, stack some bread, keep the campus moving." /></p>
            <Link href="/sell" className="bru-btn group min-h-12 w-full !whitespace-normal gap-3 bg-black px-6 py-4 text-center text-lg text-white md:min-h-16 md:w-auto md:gap-4 md:px-12 md:text-2xl"><Plus size={22} aria-hidden /> <Resp mobile="List new" desktop="List something new" /> <ArrowRight size={22} aria-hidden className="hidden transition-transform group-hover:translate-x-2 sm:block" /></Link>
          </div>
          <div className="relative hidden min-h-56 border-black bg-black md:block md:w-1/3 md:border-l-4">
            <Image src="/images/demo/hero.svg" alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover opacity-80" />
          </div>
        </div>
      </div>
    </section>
  );
}
