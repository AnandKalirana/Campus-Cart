import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sell an item", robots: { index: false } };

// Server-side gate: anonymous visitors are redirected to log in, then returned here.
async function Gate() {
  await requireUser("/sell");
  return <ComingSoon title="Sell an item" phase="Signed in" note="Listing needs a verified student account. The listing form arrives in Phase 4." />;
}
export default function Page() { return <Suspense fallback={<div className="h-64" aria-busy="true" />}><Gate /></Suspense>; }
