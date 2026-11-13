import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
import { DEMO_PRODUCTS } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }> };

// Sample listings only. Replaced by a database lookup in Phase 4.
export function generateStaticParams() {
  return DEMO_PRODUCTS.map(p => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = DEMO_PRODUCTS.find(x => x.id === id);
  return { title: p ? p.title : "Listing not found" };
}

async function Listing({ params }: Props) {
  const { id } = await params;
  const p = DEMO_PRODUCTS.find(x => x.id === id);
  if (!p) notFound();
  return <ComingSoon title={p.title} phase="Phase 4" note="Full product pages (photos, seller details, contact and wishlist) arrive with database-backed listings. This is a sample listing." />;
}

export default function ProductPage(props: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-[720px] px-5 py-24" aria-busy="true" />}>
      <Listing {...props} />
    </Suspense>
  );
}
