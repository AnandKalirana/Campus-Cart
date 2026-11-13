"use client";
import { useState } from "react";
import { CATEGORIES } from "@/lib/catalog";

export function CategoryRail({ onChange }: { onChange?: (slug: string) => void }) {
  const [active, setActive] = useState("all");
  return (
    <section aria-labelledby="cat-title" className="mx-auto mt-14 max-w-[1312px] px-5 lg:px-0">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="cat-title" className="text-[28px] font-semibold tracking-[-0.03em]">A little bit of everything.</h2>
        <p className="hidden text-[15px] text-cc-muted sm:block">Find your kind of essential.</p>
      </div>
      <ul className="no-scrollbar -mx-5 mt-6 flex snap-x gap-4 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
        {CATEGORIES.map(({ slug, name, blurb, icon: Icon }) => {
          const on = slug === active;
          return (
            <li key={slug} className="shrink-0 snap-start">
              <button type="button" aria-pressed={on} onClick={() => { setActive(slug); onChange?.(slug); }}
                className={`flex h-[83px] w-[205px] flex-col justify-center gap-2 rounded-2xl px-4 text-left transition-[transform,background-color,color] duration-200 active:scale-[0.98] ${on ? "bg-cc-ink text-white" : "bg-cc-surface hover:bg-[#eaecf1]"}`}>
                <span className="flex items-center gap-3 text-[15px] font-medium"><Icon size={20} strokeWidth={1.5} aria-hidden />{name}</span>
                <span className={`text-[11px] ${on ? "text-white/80" : "text-cc-subtle"}`}>{blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
