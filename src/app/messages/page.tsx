import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

// Server-side gate: anonymous visitors are redirected to log in, then returned here.
async function Gate() {
  await requireUser("/messages");
  return <ComingSoon title="Messages" phase="Signed in" note="Chat with sellers arrives in Phase 5." />;
}
export default function Page() { return <Suspense fallback={<div className="h-64" aria-busy="true" />}><Gate /></Suspense>; }
