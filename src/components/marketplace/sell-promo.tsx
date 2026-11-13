import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const STEPS = [
  { n: "01", title: "List in a minute", body: ["A few photos.", "A fair price."] },
  { n: "02", title: "Meet your buyer", body: ["Chat with verified students."] },
  { n: "03", title: "Pass it forward", body: ["Meet locally.", "Make their day."] },
];

export function SellPromo() {
  return (
    <section aria-labelledby="promo-title" className="mx-auto mt-16 max-w-[1312px] px-5 lg:px-0">
      <div className="grid gap-10 rounded-[28px] bg-cc-surface-blue px-6 py-10 sm:px-9 lg:grid-cols-[1fr_1.1fr] lg:gap-6 lg:py-9">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-blue">Good for your wallet. Better for the planet.</p>
          <h2 id="promo-title" className="mt-5 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">Your old stuff.<br />Someone&rsquo;s new favorite.</h2>
          <p className="mt-5 text-[15px] text-cc-muted">Make room for what&rsquo;s next. Listing is always free.</p>
          <Link href="/sell" className="mt-6 inline-flex h-10 items-center gap-8 rounded-full bg-cc-ink px-5 text-[13px] font-medium text-white transition-[transform,background-color] duration-150 hover:bg-black active:scale-[0.97]">
            Start selling <ArrowUpRight size={16} aria-hidden />
          </Link>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-muted">A second life, in three simple steps</p>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map(s => (
              <li key={s.n}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-medium text-cc-blue">{s.n}</span>
                <h3 className="mt-5 text-[16px] font-semibold">{s.title}</h3>
                <p className="mt-3 text-[13px] leading-[1.55] text-cc-muted">{s.body.map((l, i) => <span key={i} className="block">{l}</span>)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
