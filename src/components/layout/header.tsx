"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, Menu, MessageCircle, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { CampusSelector } from "./campus-selector";

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/how-it-works", label: "How it works" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-cc-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1312px] items-center gap-6 px-5 lg:h-[88px] lg:px-0">
        <Logo />
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-10 lg:flex">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
              className={`text-[15px] transition-colors hover:text-cc-ink ${active(n.href) ? "font-medium text-cc-ink" : "text-cc-muted"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <CampusSelector />
          <Link href="/wishlist" aria-label="Wishlist" className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-cc-surface"><Heart size={22} strokeWidth={1.5} /></Link>
          <Link href="/messages" aria-label="Messages" className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-cc-surface"><MessageCircle size={22} strokeWidth={1.5} /></Link>
          <Link href="/login" className="text-[15px] font-medium transition-colors hover:text-cc-blue">Log in</Link>
          <Link href="/sell" className="flex h-11 items-center gap-2.5 rounded-full bg-cc-ink px-6 text-[15px] font-medium text-white transition-[transform,background-color] duration-150 hover:bg-black active:scale-[0.97]">
            <Plus size={18} aria-hidden /> Sell an item
          </Link>
        </div>
        <button type="button" className="ml-auto grid h-11 w-11 place-items-center rounded-full hover:bg-cc-surface lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(o => !o)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-nav" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="border-t border-cc-line bg-white px-5 pb-6 pt-4 lg:hidden">
            <div className="mb-4"><CampusSelector /></div>
            <nav aria-label="Mobile" className="flex flex-col">
              {[...NAV, { href: "/wishlist", label: "Wishlist" }, { href: "/messages", label: "Messages" }, { href: "/login", label: "Log in" }].map(n => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-cc-line py-3.5 text-base">{n.label}</Link>
              ))}
            </nav>
            <Link href="/sell" onClick={() => setOpen(false)} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-cc-ink font-medium text-white">
              <Plus size={18} aria-hidden /> Sell an item
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
