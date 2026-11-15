"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { campusShort, useCampus } from "@/lib/campus-store";

/** Decorative ticker. The text is mirrored in sr-only copy; motion can be paused (WCAG 2.2.2) and stops on hover/focus and for reduced motion. */
export function Marquee() {
  const [paused, setPaused] = useState(false);
  const campus = useCampus();
  const onDashboard = usePathname().startsWith("/dashboard");
  const messages = onDashboard
    ? ["DASHBOARD STATUS: ACTIVE", campus.toUpperCase(), "BUY LOW SELL HIGH", "DON'T BE A HOARDER"]
    : ["DROP YOUR STUFF", `${campusShort(campus)} EXCLUSIVE`, "SUSTAINABLE AS F***", "NO SHIPPING", "BUY LOCAL"];
  const sep = " // ";
  const line = (onDashboard ? "✨ " + messages.join(sep) + " ✨ " : messages.join(sep) + sep).repeat(2);
  return (
    <aside aria-label="Campus Cart highlights" className="on-dark marquee relative border-b-4 border-black bg-black text-white" data-paused={paused}>
      <p className="sr-only">{messages.join(". ")}.</p>
      <div aria-hidden className="overflow-hidden py-3 pr-14">
        <div className="marquee-track font-raw text-[10px] tracking-tighter whitespace-nowrap md:text-sm">
          <span>{line}</span>
          <span data-dup>{line}</span>
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
