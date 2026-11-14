"use client";
import { useState } from "react";
import { Pause, Play } from "lucide-react";

const MESSAGES = ["Drop your stuff", "Verified students only", "Sustainable, for real", "No shipping", "Buy local"];

/** Decorative ticker. The text is mirrored in sr-only copy; motion can be paused (WCAG 2.2.2) and stops on hover/focus and for reduced motion. */
export function Marquee() {
  const [paused, setPaused] = useState(false);
  const line = MESSAGES.map(m => `${m} // `).join("");
  return (
    <aside aria-label="Campus Cart highlights" className="on-dark marquee relative border-b-4 border-black bg-black text-white" data-paused={paused}>
      <p className="sr-only">{MESSAGES.join(". ")}.</p>
      <div aria-hidden className="overflow-hidden py-3 pr-14">
        <div className="marquee-track font-raw text-sm tracking-tighter whitespace-nowrap">
          <span>{line.repeat(2)}</span>
          <span data-dup>{line.repeat(2)}</span>
        </div>
      </div>
      <button type="button" onClick={() => setPaused(p => !p)} aria-pressed={paused}
        aria-label={paused ? "Play scrolling banner" : "Pause scrolling banner"}
        className="marquee-pause absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center border-2 border-white bg-black hover:bg-white hover:text-black">
        {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
      </button>
    </aside>
  );
}
