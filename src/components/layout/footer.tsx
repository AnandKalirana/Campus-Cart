import Link from "next/link";
import { cacheLife } from "next/cache";
import { BadgeCheck, MapPin } from "lucide-react";

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

const COMMUNITY = [["Safety hub", "/safety"], ["Help", "/help"], ["How it works", "/how-it-works"]];
const LEGAL = [["Terms", "/terms"], ["Privacy", "/privacy"]];

export function Footer() {
  return (
    <footer className="on-dark mt-24 bg-black px-5 pb-12 pt-20 text-white lg:px-6 lg:pt-28">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-14 lg:grid-cols-4 lg:gap-20">
          <div className="lg:col-span-2">
            <p className="font-raw text-[clamp(2.75rem,8vw,5rem)] leading-[0.9]">Campus<br />Cart.</p>
            <p className="mt-8 max-w-lg text-xl font-bold uppercase sm:text-2xl">The circular economy for the broke and bold. Made for campus.</p>
          </div>
          <nav aria-label="Community">
            <h2 className="font-raw text-2xl">Community</h2>
            <ul className="mt-6 space-y-4 text-xl font-bold">
              {COMMUNITY.map(([l, h]) => <li key={h}><Link href={h} className="hover:line-through">{l}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2 className="font-raw text-2xl">The boring bits</h2>
            <ul className="mt-6 space-y-4 text-xl font-bold">
              {LEGAL.map(([l, h]) => <li key={h}><Link href={h} className="hover:line-through">{l}</Link></li>)}
            </ul>
          </nav>
        </div>
        <div className="mt-16 flex flex-col justify-between gap-6 border-t-8 border-white pt-8 font-raw text-base sm:text-lg md:flex-row">
          <p>© <Year /> Campus Cart</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2">
            <li className="flex items-center gap-2"><BadgeCheck size={20} aria-hidden /> Campus verified</li>
            <li className="flex items-center gap-2"><MapPin size={20} aria-hidden /> Local pickup</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
