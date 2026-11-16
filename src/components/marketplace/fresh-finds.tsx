import Link from "next/link";
import { Raw } from "@/components/ui/raw";
import { ProductCard } from "@/components/products/product-card";
import { demoCards } from "@/lib/catalog";
import { latestListings } from "@/services/listing-service";
import { getCurrentUser } from "@/lib/session";
import { savedIdsFor } from "@/services/wishlist-service";

// Server component. Real listings when there are any; clearly labelled samples otherwise (and if the DB is unreachable).
export async function FreshFinds() {
  let items = await latestListings(4).catch(() => null);
  const demo = !items || items.length === 0;
  if (demo) items = demoCards();
  const user = await getCurrentUser().catch(() => null);
  const saved = demo ? new Set<string>() : await savedIdsFor(user?.id, items!.map(i => i.id)).catch(() => new Set<string>());
  return (
    <section aria-labelledby="fresh-title" className="mx-auto mt-20 max-w-[1400px] px-5 lg:mt-28 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 id="fresh-title" className="font-raw text-[clamp(2.25rem,6.5vw,4.5rem)] italic">Hot drops <span aria-hidden>🔥</span></h2>
          <p className="mt-3 text-xl font-bold">Don&apos;t sleep on these deals.</p>
        </div>
        <Link href="/marketplace" className="bru-btn h-14 bg-black px-8 text-xl text-white"><Raw>VIEW_ALL</Raw></Link>
      </div>
      <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-14 min-[560px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
        {items!.map((p, i) => <li key={p.id} className={i % 2 ? "lg:mt-16" : ""}><ProductCard product={p} demo={demo} signedIn={!!user} initialSaved={saved.has(p.id)} /></li>)}
      </ul>
      {demo && <p className="mt-10 border-l-8 border-black pl-4 text-sm font-bold">Sample listings shown for design preview. They are not real inventory.</p>}
    </section>
  );
}
