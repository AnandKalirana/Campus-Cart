import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EditListing } from "@/components/sell/edit-listing";
import { requireUser } from "@/lib/session";
import { idSchema } from "@/lib/validation/listing";
import { getOwnedListing, listCategoriesAndCampuses } from "@/services/listing-service";
import type { StatusValue } from "@/lib/listing-format";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> };

async function Editor({ params, searchParams }: Props) {
  const { id } = await params;
  const { notice } = await searchParams;
  const user = await requireUser(`/sell/${id}/edit`);
  if (!idSchema.safeParse(id).success) notFound();
  const p = await getOwnedListing(id, user.id); // owner only; someone else's id is a plain 404
  if (!p) notFound();
  const { categories } = await listCategoriesAndCampuses();
  const values = { title: p.title, description: p.description, categorySlug: p.category.slug, condition: p.condition, price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : "", pickupLocation: p.pickupLocation };
  return <EditListing id={p.id} status={p.status as StatusValue} values={values} images={p.images} categories={categories} notice={notice} />;
}

export default function Page(props: Props) {
  return (
    <section className="mx-auto max-w-[760px] px-5 pb-24 pt-12">
      <Link href="/dashboard/listings" className="text-sm font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">← My listings</Link>
      <h1 className="font-raw mb-8 mt-4 text-[clamp(2rem,5vw,3.25rem)] leading-[0.95]">Edit listing</h1>
      <Suspense fallback={<div className="h-96" aria-busy="true" />}><Editor {...props} /></Suspense>
    </section>
  );
}
