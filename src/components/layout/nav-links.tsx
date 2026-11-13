"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/how-it-works", label: "How it works" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(n => {
        const on = pathname === n.href || pathname.startsWith(n.href + "/");
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={`text-[15px] transition-colors hover:text-cc-ink ${on ? "font-medium text-cc-ink" : "text-cc-muted"}`}>
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

/** Same links without active state, rendered in the static shell until the pathname is known. */
export function NavLinksFallback() {
  return (
    <>
      {NAV.map(n => (
        <Link key={n.href} href={n.href} className="text-[15px] text-cc-muted transition-colors hover:text-cc-ink">{n.label}</Link>
      ))}
    </>
  );
}
