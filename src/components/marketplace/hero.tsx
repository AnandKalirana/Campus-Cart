import Image from "next/image";
import { Zap } from "lucide-react";
import { SearchBar } from "./search-bar";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1400px] px-5 pb-8 pt-10 lg:px-6 lg:pt-16">
      <div className="grid items-start gap-12 lg:grid-cols-12">
        <div className="relative z-10 min-w-0 space-y-8 lg:col-span-8 lg:space-y-10">
          <p className="font-raw tilt-1 inline-block border-4 border-black bg-cc-green px-5 py-2 text-lg sm:text-xl">Pre-loved &amp; circular</p>
          <h1 id="hero-title" className="font-raw text-[clamp(2.4rem,8.5vw,6.5rem)] leading-[0.9]">
            Big campus<br />
            <span className="bg-black px-3 italic text-white">energy.</span><br />
            Small price tags.
          </h1>
          <p className="max-w-2xl border-l-8 border-black pl-5 text-xl font-bold leading-snug sm:pl-8 sm:text-2xl">
            Your dorm clutter is another student&rsquo;s treasure. A campus-only marketplace for the bold and the budget-minded. No fluff, just gear.
          </p>
          <SearchBar />
        </div>
        <div className="relative pb-0 lg:col-span-4 lg:pb-10">
          <div className="bru-card tilt-2 bg-cc-yellow p-2">
            <Image src="/images/demo/hero.svg" alt="Textbooks, a laptop, headphones and a desk lamp arranged on a pale studio plinth" width={800} height={600} priority sizes="(min-width:1024px) 400px, 100vw"
              className="h-[300px] w-full border-4 border-black object-cover sm:h-[420px] lg:h-[480px]" />
          </div>
          <div className="bru-card tilt-1 mt-6 w-full max-w-xs p-5 lg:absolute lg:-bottom-2 lg:-left-16 lg:mt-0 lg:w-64">
            <Zap size={40} className="text-cc-orange" fill="currentColor" stroke="#000" strokeWidth={2} aria-hidden />
            <p className="font-raw mt-3 text-2xl">Zero shipping</p>
            <p className="font-bold">Meet on campus. Pay in person.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
