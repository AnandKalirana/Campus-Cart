import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { SearchBar } from "./search-bar";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1312px] px-5 pt-5 lg:px-0">
      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[28px] bg-cc-surface lg:grid-cols-[1fr_1.07fr]">
        <div className="order-2 flex min-w-0 flex-col justify-center px-6 py-10 sm:px-10 lg:order-1 lg:px-10 lg:py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cc-blue">Less spending. More living.</p>
          <h1 id="hero-title" className="mt-6 text-[32px] font-semibold leading-[1.1] min-[400px]:text-[38px] tracking-[-0.035em] sm:text-[48px] lg:text-[52px]">
            Big campus energy.<br />Small price tags.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.55] text-cc-muted">
            Your next great find is already on campus.<br className="hidden sm:block" /> Buy and sell pre-loved essentials with students nearby.
          </p>
          <div className="mt-8"><SearchBar /></div>
          <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-cc-muted">
            <li className="flex items-center gap-2"><ShieldCheck size={18} strokeWidth={1.5} aria-hidden /> Campus verified</li>
            <li aria-hidden className="hidden sm:block">·</li>
            <li>Local pickup. Zero shipping.</li>
          </ul>
        </div>
        <div className="relative order-1 min-h-[260px] sm:min-h-[340px] lg:order-2 lg:min-h-[414px]">
          <Image src="/images/demo/hero.svg" alt="Textbooks, a laptop, headphones and a desk lamp arranged on a pale studio plinth" fill priority sizes="(min-width:1024px) 680px, 100vw" className="object-cover" />
          <p className="absolute bottom-5 left-5 right-5 rounded-full bg-white px-5 py-3 text-center text-[13px] font-medium shadow-[0_4px_16px_rgba(16,24,40,0.08)] sm:left-auto sm:right-10 sm:bottom-8 sm:w-auto sm:px-6">
            Good finds. Better student life.
          </p>
        </div>
      </div>
    </section>
  );
}
