import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SellForm } from "@/components/sell/sell-form";
import { requireUser } from "@/lib/session";
import { listCategoriesAndCampuses } from "@/services/listing-service";

export const metadata: Metadata = { title: "Sell an item", robots: { index: false } };

// Server-side gate: anonymous visitors go to log in and return here. Listing needs a verified student with a campus.
async function Gate() {
  const user = await requireUser("/sell");
  const blocked = !user.emailVerified ? "Verify your college email first. Check your inbox for the link." : !user.universityId ? "Your account has no campus yet, so we can't place your listing." : null;
  if (blocked) return (
    <div className="bru-card p-7"><p role="alert" className="text-xl font-bold">{blocked}</p><Link href="/dashboard" className="bru-btn mt-6 h-12 bg-black px-6 text-base text-white">Back to dashboard</Link></div>
  );
  const { categories } = await listCategoriesAndCampuses();
  return <SellForm categories={categories} />;
}

export default function Page() {
  return (
    <section className="mx-auto max-w-[760px] px-5 pb-24 pt-12">
      <h1 className="font-raw text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">Your sh*t. Their luck.</h1>
      <p className="mb-8 mt-4 text-lg font-bold">List it in a minute. It goes live on your campus once it has a photo.</p>
      <Suspense fallback={<div className="h-96" aria-busy="true" />}><Gate /></Suspense>
    </section>
  );
}
