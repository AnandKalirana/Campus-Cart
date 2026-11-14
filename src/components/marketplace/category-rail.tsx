"use client";
import { useState } from "react";
import { CATEGORIES } from "@/lib/catalog";

const TINTS = ["bg-cc-sky", "bg-cc-orange", "bg-cc-pink", "bg-cc-yellow", "bg-cc-green"];

export function CategoryRail({ onChange }: { onChange?: (slug: string) => void }) {
  const [active, setActive] = useState("all");
  return (
    <section aria-labelledby="cat-title" className="mx-auto mt-16 max-w-[1400px] px-5 lg:mt-24 lg:px-6">
      <h2 id="cat-title" className="font-raw text-[clamp(2.25rem,6vw,4rem)] underline decoration-8 underline-offset-8">The stuff</h2>
      <p className="mt-6 text-lg font-bold">Pick a lane. Find your kind of essential.</p>
      <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-6 sm:gap-x-6">
        {CATEGORIES.map(({ slug, name, blurb, icon: Icon }, i) => {
          const on = slug === active;
          return (
            <li key={slug}>
              <button type="button" aria-pressed={on} onClick={() => { setActive(slug); onChange?.(slug); }}
                className={`bru-card bru-card-lift ${i % 2 ? "tilt-2" : "tilt-1"} untilt flex min-h-16 cursor-pointer flex-col items-start justify-center gap-1 px-5 py-3 text-left sm:px-7 ${on ? "bg-black text-white" : TINTS[i % TINTS.length]}`}>
                <span className="font-raw flex items-center gap-3 text-xl sm:text-2xl"><Icon size={22} aria-hidden />{name}</span>
                <span className="text-xs font-bold sm:text-sm">{blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
