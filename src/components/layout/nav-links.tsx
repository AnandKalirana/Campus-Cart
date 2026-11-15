"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/how-it-works", label: "How it works" },
];
export const ACCOUNT_NAV = { href: "/dashboard", label: "Dashboard" };

const base = "px-2 transition-colors";

export function NavLinks({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const items = signedIn ? [NAV[0], ACCOUNT_NAV, NAV[1]] : NAV;
  return (
    <>
      {items.map(n => {
        const on = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={on ? `${base} tilt-1 bg-black px-4 py-1 text-white` : `bru-link`}>
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

/** Same links without active state, rendered in the static shell until the session and pathname are known. */
export function NavLinksFallback() {
  return (
    <>
      {NAV.map(n => <Link key={n.href} href={n.href} className="bru-link">{n.label}</Link>)}
    </>
  );
}
