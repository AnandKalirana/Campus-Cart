import Link from "next/link";
import { Resp } from "@/components/ui/resp";

/** Only Overview, Saved items (wishlist) have pages today; the rest are shown but marked as coming soon. */
export function DashboardTabs() {
  const item = "px-4 py-2 font-raw text-xs whitespace-nowrap md:px-6 md:text-lg";
  return (
    <nav aria-label="Dashboard sections" className="no-scrollbar mb-12 flex gap-3 overflow-x-auto border-b-4 border-black pb-4">
      <Link href="/dashboard" aria-current="page" className={`${item} tilt-1 bg-black text-white`}>Overview</Link>
      <span aria-disabled="true" className={`${item} border-2 border-transparent text-cc-muted`}>My listings <small className="font-sans text-xs font-bold normal-case tracking-normal">(soon)</small></span>
      <Link href="/wishlist" className={`${item} border-2 border-transparent hover:border-black`}>Saved items</Link>
      <span aria-disabled="true" className={`${item} border-2 border-transparent text-cc-muted`}><Resp mobile="Settings" desktop="Profile & settings" /> <small className="font-sans text-xs font-bold normal-case tracking-normal">(soon)</small></span>
    </nav>
  );
}
