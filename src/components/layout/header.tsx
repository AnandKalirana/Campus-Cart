import Link from "next/link";
import { Suspense } from "react";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { CampusSelector } from "./campus-selector";
import { MobileMenu } from "./mobile-menu";
import { NavLinksFallback } from "./nav-links";
import { PrimaryNav } from "./primary-nav";
import { AccountMenu, MobileAccountLinks } from "./account-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-black bg-cc-paper">
      <div className="relative mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3 lg:px-6 lg:py-5">
        <Logo />
        <nav aria-label="Primary" className="ml-2 hidden items-center gap-3 font-raw text-lg min-[1400px]:flex 2xl:ml-4 2xl:gap-5 2xl:text-xl">
          <Suspense fallback={<NavLinksFallback />}><PrimaryNav /></Suspense>
        </nav>
        <div className="ml-auto hidden items-center gap-3 min-[1400px]:flex 2xl:gap-4">
          <CampusSelector />
          <Link href="/wishlist" aria-label="Wishlist" className="bru-btn h-12 w-12 bg-white"><Heart size={22} aria-hidden /></Link>
          <Link href="/messages" aria-label="Messages" className="bru-btn h-12 w-12 bg-white"><MessageCircle size={22} aria-hidden /></Link>
          <Suspense fallback={<Link href="/login" className="bru-btn h-12 bg-white px-5 text-lg">Log in</Link>}><AccountMenu /></Suspense>
          <Link href="/sell" className="bru-btn tilt-2 h-12 bg-cc-orange px-6 text-xl text-black"><Plus size={20} aria-hidden /> Sell now</Link>
        </div>
        <MobileMenu account={<Suspense fallback={<Link href="/login" className="block border-b-4 border-black py-3.5 font-raw text-xl">Log in</Link>}><MobileAccountLinks /></Suspense>} />
      </div>
    </header>
  );
}
