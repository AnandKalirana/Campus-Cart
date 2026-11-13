"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatINR, type DemoProduct } from "@/lib/catalog";

export function ProductCard({ product: p }: { product: DemoProduct }) {
  const [prompt, setPrompt] = useState(false);
  return (
    <article className="group relative">
      <Link href={`/products/${p.id}`} className="block rounded-[20px]" aria-label={`${p.title}, ${formatINR(p.price)}`}>
        <div className="relative aspect-[316/224] overflow-hidden rounded-[20px] bg-cc-surface">
          <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width:1024px) 316px, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
          <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-medium">{p.condition}</span>
        </div>
        <div className="pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-cc-muted">{p.categoryLabel}</p>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.01em]">{p.title}</h3>
          <p className="mt-1 text-xs text-cc-muted">{p.description}</p>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="text-[24px] font-semibold tracking-tight">{formatINR(p.price)}</span>
              <s className="text-xs text-cc-subtle">{formatINR(p.originalPrice)}</s>
            </p>
            <span className="text-xs text-cc-muted">{p.distance}</span>
          </div>
        </div>
      </Link>
      <button type="button" aria-label={`Save ${p.title} to wishlist`} aria-expanded={prompt} onClick={() => setPrompt(v => !v)}
        className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full bg-white transition-transform duration-150 active:scale-90">
        <Heart size={18} strokeWidth={1.5} aria-hidden />
      </button>
      <AnimatePresence>
        {prompt && (
          <motion.div role="status" initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }} style={{ transformOrigin: "top right" }}
            className="absolute right-3.5 top-14 z-10 w-56 rounded-2xl border border-cc-line bg-white p-4 text-sm shadow-[0_12px_32px_rgba(16,24,40,0.12)]">
            <p className="font-medium">Log in to save finds</p>
            <p className="mt-1 text-xs text-cc-muted">Your wishlist stays with your student account.</p>
            <Link href="/login" className="mt-3 inline-flex h-9 items-center rounded-full bg-cc-ink px-4 text-xs font-medium text-white">Log in</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
