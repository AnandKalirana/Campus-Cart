"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CampusSelector } from "./campus-selector";
import { NAV } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const links = [...NAV, { href: "/wishlist", label: "Wishlist" }, { href: "/messages", label: "Messages" }, { href: "/login", label: "Log in" }];
  return (
    <>
      <button type="button" className="ml-auto grid h-11 w-11 place-items-center rounded-full hover:bg-cc-surface lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(o => !o)}>
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-nav" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-x-0 top-full border-b border-cc-line bg-white px-5 pb-6 pt-4 lg:hidden">
            <div className="mb-4"><CampusSelector /></div>
            <nav aria-label="Mobile" className="flex flex-col">
              {links.map(n => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-cc-line py-3.5 text-base">{n.label}</Link>
              ))}
            </nav>
            <Link href="/sell" onClick={() => setOpen(false)} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-cc-ink font-medium text-white">
              <Plus size={18} aria-hidden /> Sell an item
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
