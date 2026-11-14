import type { Metadata } from "next";
import { Suspense } from "react";
import { ComingSoon } from "@/components/ui/coming-soon";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your dashboard", robots: { index: false } };

// Server-side gate: anonymous visitors are redirected to log in, then returned here.
async function Gate() {
  await requireUser("/dashboard");
  return <ComingSoon title="Your dashboard" phase="Signed in" note="Your listings, requests and account settings arrive in Phases 4 and 5." />;
}
export default function Page() { return <Suspense fallback={<div className="h-64" aria-busy="true" />}><Gate /></Suspense>; }
