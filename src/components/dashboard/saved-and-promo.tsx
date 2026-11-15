import Link from "next/link";
import { ArrowRight, Heart, Plus } from "lucide-react";
import { Resp } from "@/components/ui/resp";
import type { DashboardStats } from "@/services/dashboard-service";

interface SavedAndPromoProps {
  stats: DashboardStats;
}

export function SavedAndPromo({ stats }: SavedAndPromoProps) {
  const savedCount = stats.savedItems;

  return (
    <section aria-labelledby="saved-title" className="mb-8">
      <div className="mb-6 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between md:gap-4">
        <h2 id="saved-title" className="font-raw text-3xl md:text-6xl"><Resp mobile="Still thinking?" desktop="Still on your mind?" /></h2>
        <Link href="/wishlist" className="text-lg font-bold underline decoration-8 decoration-cc-red underline-offset-8 hover:bg-black hover:text-white md:text-xl">
          {savedCount > 0 ? `View all ${savedCount} saved item${savedCount === 1 ? "" : "s"}` : <Resp mobile="View saves" desktop="View saved items" />}
        </Link>
      </div>

      {savedCount === 0 ? (
        <div className="bru-card p-8 md:p-12 text-center">
          <Heart className="mx-auto h-16 w-16 text-cc-muted mb-4" aria-hidden />
          <p className="font-raw text-2xl mb-2">Nothing saved yet</p>
          <p className="text-lg font-bold text-cc-muted mb-6 max-w-md mx-auto">Find something you like? Tap the heart to save it for later.</p>
          <Link href="/marketplace" className="bru-btn h-12 bg-black px-6 text-base inline-flex text-white">Browse marketplace</Link>
        </div>
      ) : (
        <div className="bru-card p-8 text-center">
          <p className="font-raw text-xl mb-2">Your saved items live on the <a href="/wishlist" className="underline decoration-8 decoration-cc-red underline-offset-8 hover:bg-black hover:text-white">Wishlist page</a></p>
          <p className="text-lg font-bold text-cc-muted mb-6">{savedCount} item{savedCount === 1 ? "" : "s"} saved</p>
          <Link href="/wishlist" className="bru-btn h-12 bg-black px-6 text-base inline-flex text-white">View all saves</Link>
        </div>
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
