import Link from "next/link";
import { Suspense } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CampusSelector } from "./campus-selector";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavLinksFallback } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-cc-line bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex h-[72px] max-w-[1312px] items-center gap-6 px-5 lg:h-[88px] lg:px-0">
        <Logo />
        <nav aria-label="Primary" className="ml-6 hidden items-center gap-10 lg:flex">
          <Suspense fallback={<NavLinksFallback />}><NavLinks /></Suspense>
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
        <MobileMenu />
      </div>
    </header>
  );
}
