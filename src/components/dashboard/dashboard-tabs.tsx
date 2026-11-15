import Link from "next/link";
import { Resp } from "@/components/ui/resp";

export function DashboardTabs() {
  const item = "px-4 py-2 font-raw text-xs whitespace-nowrap md:px-6 md:text-lg";
  return (
    <nav aria-label="Dashboard sections" className="no-scrollbar mb-12 flex gap-3 overflow-x-auto border-b-4 border-black pb-4">
      <Link href="/dashboard" aria-current="page" className={`${item} tilt-1 bg-black text-white`}>Overview</Link>
      <Link href="/dashboard" className={`${item} border-2 border-transparent hover:border-black`}>My listings</Link>
      <Link href="/wishlist" className={`${item} border-2 border-transparent hover:border-black`}>Saved items</Link>
      <Link href="/profile" className={`${item} border-2 border-transparent hover:border-black`}><Resp mobile="Settings" desktop="Profile & settings" /></Link>
    </nav>
  );
}
