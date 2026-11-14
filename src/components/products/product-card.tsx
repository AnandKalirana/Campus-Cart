"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { formatINR, type DemoProduct } from "@/lib/catalog";

const CHIP: Record<string, string> = { laptops: "bg-cc-yellow", books: "bg-cc-sky", electronics: "bg-cc-green", "hostel-essentials": "bg-cc-pink" };

export function ProductCard({ product: p }: { product: DemoProduct }) {
  const [prompt, setPrompt] = useState(false);
  return (
    <article className="group relative">
      <Link href={`/products/${p.id}`} className="block" aria-label={`${p.title}, ${formatINR(p.price)}`}>
        <div className="bru-card bru-card-lift relative overflow-hidden">
          <Image src={p.image} alt={p.imageAlt} width={400} height={300} sizes="(min-width:1024px) 300px, (min-width:560px) 50vw, 100vw" className="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 sm:h-72" />
          <span className="font-raw absolute left-3 top-3 border-4 border-black bg-white px-3 py-1 text-xs">{p.condition}</span>
        </div>
        <div className="mt-6">
          <span className={`font-raw inline-block border-2 border-black px-2 py-0.5 text-xs ${CHIP[p.categorySlug] ?? "bg-white"}`}>{p.categoryLabel}</span>
          <h3 className="font-raw mt-3 text-2xl leading-none">{p.title}</h3>
          <p className="mt-2 text-sm font-bold">{p.description}</p>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="flex items-baseline gap-3">
              <span className="font-raw text-3xl">{formatINR(p.price)}</span>
              <s className="strike-bold text-base font-bold text-[#525252]"><span className="sr-only">Original price </span>{formatINR(p.originalPrice)}</s>
            </p>
            <span className="text-sm font-bold">{p.distance}</span>
          </div>
        </div>
      </Link>
      <button type="button" aria-label={`Save ${p.title} to wishlist`} aria-expanded={prompt} onClick={() => setPrompt(v => !v)}
        className="bru-btn absolute right-3 top-3 h-11 w-11 bg-white !shadow-[3px_3px_0_#000] hover:!bg-black hover:!text-white">
        <Heart size={20} aria-hidden />
      </button>
      <AnimatePresence>
        {prompt && (
          <motion.div role="status" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="bru-card absolute right-3 top-16 z-10 w-60 p-4">
            <p className="font-raw text-base">Log in to save finds</p>
            <p className="mt-1 text-sm font-bold">Your wishlist stays with your student account.</p>
            <Link href="/login" className="bru-btn mt-3 h-10 bg-black px-4 text-sm text-white">Log in</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
