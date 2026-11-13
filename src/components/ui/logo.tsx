import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Campus Cart home" className={`flex items-center gap-3 ${className}`}>
      <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-cc-ink text-white">
        <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-[22px] font-semibold tracking-tight">campus cart</span>
    </Link>
  );
}
