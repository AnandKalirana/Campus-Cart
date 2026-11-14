"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CampusSelector } from "./campus-selector";
import { NAV } from "./nav-links";

/** `account` is a server-rendered slot (Dashboard/Log in/Log out) so the menu reflects the real session. */
export function MobileMenu({ account }: { account: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const links = [...NAV, { href: "/wishlist", label: "Wishlist" }, { href: "/messages", label: "Messages" }];
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" className="bru-btn ml-auto h-12 w-12 bg-white min-[1400px]:hidden" aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(o => !o)}>
        {open ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-nav" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto border-b-4 border-black bg-cc-paper px-5 pb-6 pt-4 min-[1400px]:hidden">
            <div className="mb-4"><CampusSelector /></div>
            <nav aria-label="Mobile" className="flex flex-col" onClick={e => { if ((e.target as HTMLElement).closest("a,[data-close]")) close(); }}>
              {links.map(n => <Link key={n.href} href={n.href} className="block border-b-4 border-black py-3.5 font-raw text-xl">{n.label}</Link>)}
              {account}
            </nav>
            <Link href="/sell" onClick={close} className="bru-btn tilt-2 mt-6 h-14 w-full bg-cc-orange text-2xl text-black">
              <Plus size={22} aria-hidden /> Sell now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
