import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Campus Cart home" className={`group flex items-center gap-2 ${className}`}>
      <span className="bg-black p-2.5 text-white transition-[rotate] duration-100 [rotate:-5deg] group-hover:[rotate:0deg] lg:p-3">
        <ShoppingBag size={26} strokeWidth={2} aria-hidden />
      </span>
      <span className="font-raw text-2xl leading-[0.9] lg:text-4xl">Campus<br />Cart</span>
    </Link>
  );
}
