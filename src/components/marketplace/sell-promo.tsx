import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const STEPS = [
  { n: "01", title: "List it", color: "text-white" },
  { n: "02", title: "Meet up", color: "text-cc-orange" },
  { n: "03", title: "Cash out", color: "text-white" },
];

export function SellPromo() {
  return (
    <section aria-labelledby="promo-title" className="mx-auto mt-24 max-w-[1400px] px-5 lg:mt-32 lg:px-6">
      <div className="on-dark relative overflow-hidden border-b-[14px] border-r-[14px] border-cc-red bg-black p-7 text-white sm:p-12 lg:p-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8">
            <h2 id="promo-title" className="font-raw text-[clamp(2.4rem,7vw,5.5rem)] italic leading-[0.9]">Your stuff. Their luck.</h2>
            <p className="border-l-8 border-cc-red pl-5 text-xl font-bold sm:pl-8 sm:text-2xl">Empty your room before move-out. Get paid, keep it circular. Listing is always free.</p>
            <div className="flex flex-wrap gap-5 pt-4">
              <Link href="/sell" className="bru-btn h-14 bg-cc-red px-8 text-xl text-white hover:!bg-white hover:!text-black sm:text-2xl">Start selling <ArrowUpRight size={22} aria-hidden /></Link>
              <Link href="/how-it-works" className="bru-btn h-14 bg-white px-8 text-xl text-black sm:text-2xl">How it works</Link>
            </div>
          </div>
          <ol className="grid content-center gap-8 font-raw text-4xl sm:text-5xl">
            {STEPS.map(s => (
              <li key={s.n} className={`flex items-center gap-5 ${s.color}`}><span className="text-6xl sm:text-7xl" aria-hidden>{s.n}</span>{s.title}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
