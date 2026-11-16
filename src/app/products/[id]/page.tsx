import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gallery } from "@/components/products/gallery";
import { formatINR, DEMO_PRODUCTS } from "@/lib/catalog";
import { CONDITION_LABEL, type ConditionValue } from "@/lib/listing-format";
import { getCurrentUser } from "@/lib/session";
import { idSchema } from "@/lib/validation/listing";
import { getListingForViewer } from "@/services/listing-service";
import { ComingSoon } from "@/components/ui/coming-soon";
import { ReportButton } from "@/components/products/report-button";
import { MessageSellerButton } from "@/components/messages/message-seller-button";
import { findBuyerConversationId } from "@/services/messaging-service";
import { PurchaseRequestButton } from "@/components/purchase-request/purchase-request-button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (idSchema.safeParse(id).success) {
    // Public lookup only: never leak a hidden listing's title through metadata.
    const hit = await getListingForViewer(id, null).catch(() => null);
    if (hit) return { title: hit.listing.title, description: hit.listing.description.slice(0, 150) };
  }
  return { title: "Listing not found", robots: { index: false } };
}

async function Listing({ params }: Props) {
  const { id } = await params;
  if (id.startsWith("demo-")) {
    const d = DEMO_PRODUCTS.find(x => x.id === id);
    if (!d) notFound();
    return <ComingSoon title={d.title} phase="Sample" note="This is a sample listing from the design preview, not a real item." />;
  }
  if (!idSchema.safeParse(id).success) notFound();
  const user = await getCurrentUser();
  const hit = await getListingForViewer(id, user);
  if (!hit) notFound();
  const { listing: p, isOwner } = hit;
  const threadId = user && !isOwner ? await findBuyerConversationId(user.id, p.id) : null;
  const sold = p.status === "SOLD";
  const hidden = p.status === "PAUSED";
  const next = encodeURIComponent(`/products/${p.id}`);
  const discount = p.originalPrice && p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  return (
    <article className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 lg:px-6">
      <nav aria-label="Breadcrumb" className="text-sm font-bold">
        <Link href="/marketplace" className="underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">Marketplace</Link>
        <span aria-hidden> / </span>
        <Link href={`/marketplace?category=${p.category.slug}`} className="underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">{p.category.name}</Link>
      </nav>
      {(sold || hidden) && (
        <p role="status" className={`mt-6 border-4 border-black px-4 py-3 text-lg font-bold ${sold ? "bg-cc-pink" : "bg-cc-yellow"}`}>
          {sold ? "This one's gone. It has been sold." : "Paused: only you can see this listing."}
        </p>
      )}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <Gallery images={p.images} title={p.title} />
        <div>
          <span className="font-raw inline-block border-2 border-black bg-cc-yellow px-2 py-0.5 text-xs">{p.category.name}</span>
          <h1 className="font-raw mt-4 text-[clamp(2rem,5vw,3.25rem)] leading-[0.95] [overflow-wrap:anywhere]">{p.title}</h1>
          <p className="mt-6 flex flex-wrap items-baseline gap-4">
            <span className="font-raw text-5xl">{formatINR(p.price)}</span>
            {p.originalPrice ? <s className="strike-bold text-xl font-bold text-[#525252]"><span className="sr-only">Original price </span>{formatINR(p.originalPrice)}</s> : null}
            {discount > 0 && <span className="font-raw border-4 border-black bg-cc-green px-2 text-sm">{discount}% off</span>}
          </p>
          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-lg">
            <dt className="font-raw text-sm">Condition</dt><dd className="font-bold">{CONDITION_LABEL[p.condition as ConditionValue]}</dd>
            <dt className="font-raw text-sm">Campus</dt><dd className="font-bold">{p.university.name}</dd>
            <dt className="font-raw text-sm">Pickup spot</dt><dd className="font-bold [overflow-wrap:anywhere]">{p.pickupLocation}</dd>
            <dt className="font-raw text-sm">Listed</dt><dd className="font-bold"><time dateTime={p.createdAt.toISOString()}>{p.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></dd>
            <dt className="font-raw text-sm">Seller</dt><dd className="font-bold">{p.seller.name.split(" ")[0]}</dd>
          </dl>
          <div className="mt-8 flex flex-wrap gap-4">
            {isOwner ? (
              <Link href={`/sell/${p.id}/edit`} className="bru-btn h-14 bg-cc-orange px-8 text-xl">Edit listing</Link>
            ) : sold ? null : user ? (
              <>
                <PurchaseRequestButton productId={p.id} productTitle={p.title} productPrice={p.price} />
                {threadId
                  ? <Link href={`/messages/${threadId}`} className="bru-btn flex h-14 flex-1 items-center justify-center bg-white px-8 text-xl">Open chat</Link>
                  : <MessageSellerButton productId={p.id} productTitle={p.title} sellerName={p.seller.name.split(" ")[0]} />}
              </>
            ) : (
              <Link href={`/login?next=${next}`} className="bru-btn h-14 bg-black px-8 text-xl text-white">Log in to contact seller</Link>
            )}
          </div>
        </div>
      </div>
      <section aria-labelledby="desc" className="mt-12 max-w-[760px]">
        <h2 id="desc" className="font-raw text-2xl">The deets</h2>
        {/* Plain text only: rendered by React (escaped), newlines preserved. No HTML is ever interpreted. */}
        <p className="mt-4 whitespace-pre-line text-lg font-bold leading-snug [overflow-wrap:anywhere]">{p.description}</p>
      </section>
      <p className="mt-10 max-w-[760px] border-l-8 border-black pl-4 text-sm font-bold">
        Meet in a busy campus spot, check the item before you pay, and keep payment between you and the seller. Campus Cart doesn&apos;t handle money.
      </p>
      {!isOwner && p.status !== "REMOVED" && <ReportButton productId={p.id} signedIn={!!user} />}
    </article>
  );
}

export default function ProductPage(props: Props) {
  return <Suspense fallback={<div className="mx-auto h-96 max-w-[1200px] px-5 py-24" aria-busy="true" />}><Listing {...props} /></Suspense>;
}
