import Link from "next/link";
import { cacheLife } from "next/cache";

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-[1312px] px-5 pb-12 lg:px-0">
      <div className="border-t border-cc-line pt-10">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr_auto] md:items-start">
          <div>
            <p className="text-[22px] font-semibold tracking-tight">campus cart</p>
            <p className="mt-3 text-sm text-cc-muted">A smarter way to student.</p>
          </div>
          <p className="text-sm text-cc-muted md:pt-1.5">Made for campus. Built for community.</p>
          <div className="md:text-right">
            <nav aria-label="Footer" className="flex gap-8 text-sm md:justify-end">
              {[["Safety", "/safety"], ["Help", "/help"], ["Terms", "/terms"], ["Privacy", "/privacy"]].map(([l, h]) => (
                <Link key={h} href={h} className="font-medium transition-colors hover:text-cc-blue">{l}</Link>
              ))}
            </nav>
            <p className="mt-6 text-xs text-cc-muted">© <Year /> Campus Cart</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
