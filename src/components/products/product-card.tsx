"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatINR } from "@/lib/catalog";
import { CONDITION_LABEL, type ListingCardData } from "@/lib/listing-format";

const CHIP: Record<string, string> = { laptops: "bg-cc-yellow", books: "bg-cc-sky", electronics: "bg-cc-green", "hostel-essentials": "bg-cc-pink" };

interface ProductCardProps {
  product: ListingCardData;
  demo?: boolean;
  headingLevel?: 2 | 3;
  /** Resolved on the server from the session. Never trust it for authorization: the API re-checks. */
  signedIn?: boolean;
  initialSaved?: boolean;
}

export function ProductCard({ product: p, demo = false, headingLevel = 3, signedIn = false, initialSaved = false }: ProductCardProps) {
  const H = `h${headingLevel}` as const;
  const [notice, setNotice] = useState<null | "login" | "demo" | "error" | "busy">(null);
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (demo) { setNotice("demo"); return; }
    if (!signedIn) { setNotice("login"); return; }
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, saved: !saved }),
      });
      if (res.status === 401) { setNotice("login"); return; }
      if (res.status === 429) { setNotice("busy"); return; }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setSaved(Boolean(data.saved));
      else setNotice("error");
    } catch {
      setNotice("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="group relative">
      <Link href={`/products/${p.id}`} className="block" aria-label={`${p.title}, ${formatINR(p.price)}`}>
        <div className="bru-card bru-card-lift relative overflow-hidden">
          {p.image ? (
            <Image src={p.image} alt={p.imageAlt} width={400} height={300} unoptimized={!demo} sizes="(min-width:1024px) 300px, (min-width:560px) 50vw, 100vw" className="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 sm:h-72" />
          ) : (
            <div className="font-raw flex h-64 w-full items-center justify-center bg-white text-xl sm:h-72" role="img" aria-label="No photo">NO_PIC</div>
          )}
          <span className="font-raw absolute left-3 top-3 border-4 border-black bg-white px-3 py-1 text-xs">{CONDITION_LABEL[p.condition]}</span>
        </div>
        <div className="mt-6">
          <span className={`font-raw inline-block border-2 border-black px-2 py-0.5 text-xs ${CHIP[p.categorySlug] ?? "bg-white"}`}>{p.categoryName}</span>
          <H className="font-raw mt-3 text-2xl leading-none">{p.title}</H>
          <p className="mt-2 line-clamp-2 text-sm font-bold">{p.description}</p>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="flex items-baseline gap-3">
              <span className="font-raw text-3xl">{formatINR(p.price)}</span>
              {p.originalPrice ? <s className="strike-bold text-base font-bold text-[#525252]"><span className="sr-only">Original price </span>{formatINR(p.originalPrice)}  </s> : null}
            </p>
            <span className="text-right text-sm font-bold">{p.campusName}</span>
          </div>
        </div>
      </Link>
      <button type="button" aria-label={`Save ${p.title} to wishlist`} aria-pressed={saved} aria-busy={saving} onClick={handleSave}
        className={`bru-btn absolute right-3 top-3 h-11 w-11 !shadow-[3px_3px_0_#000] transition-colors ${saved ? "bg-cc-pink !text-white hover:!bg-cc-pink/80" : "bg-white hover:!bg-black hover:!text-white"}`}>
        <Heart size={20} aria-hidden className={saved ? "fill-current" : ""} />
      </button>
      <AnimatePresence>
        {notice && (
          <motion.div role="status" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="bru-card absolute right-3 top-16 z-10 w-60 p-4">
            {notice === "login" ? (
              <>
                <p className="font-raw text-base">Log in to save finds</p>
                <p className="mt-1 text-sm font-bold">Your wishlist stays with your student account.</p>
                <Link href="/login" className="bru-btn mt-3 h-10 bg-black px-4 text-sm text-white">Log in</Link>
              </>
            ) : (
              <p className="text-sm font-bold">{notice === "demo" ? "Sample listings can't be saved." : notice === "busy" ? "Slow down a sec, then try again." : "Couldn't update your wishlist. Please try again."}</p>
            )}
            <button type="button" onClick={() => setNotice(null)} className="mt-2 text-sm font-bold underline decoration-2 underline-offset-4">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}