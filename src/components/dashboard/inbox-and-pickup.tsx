import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail } from "lucide-react";
import { Resp } from "@/components/ui/resp";
import type { PurchaseRequestWithDetails } from "@/services/purchase-request-service";

interface InboxAndPickupProps {
  conversations: Awaited<ReturnType<typeof import("@/services/dashboard-service").getRecentConversations>>;
  purchaseRequests: PurchaseRequestWithDetails[];
  accepted: PurchaseRequestWithDetails[];
}

export function InboxAndPickup({ conversations, purchaseRequests, accepted }: InboxAndPickupProps) {
  const pendingRequests = purchaseRequests.filter(r => r.status === "PENDING");
  const next = accepted[0];

  return (
    <div className="min-w-0 space-y-12">
      <section aria-labelledby="inbox-title">
        <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
          <h2 id="inbox-title" className="font-raw text-2xl md:text-4xl">The inbox</h2>
          <Link href="/messages" className="text-xs font-bold uppercase underline hover:bg-black hover:text-white md:text-sm"><Resp mobile="All" desktop="Messages" /></Link>
        </div>

        {/* Purchase Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-4 space-y-3">
            <p className="font-raw text-sm text-cc-muted">Purchase requests</p>
            {pendingRequests.slice(0, 3).map(r => (
              <Link key={r.id} href={`/products/${r.productId}`} className="bru-card-lift flex items-center gap-3 p-3 border-2 border-black hover:bg-[#fef9c3] transition-colors">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden border-2 border-black bg-cc-sky">
                  {r.productImage ? (
                    <Image src={r.productImage} alt="" fill sizes="40px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-raw text-sm">{r.productTitle.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-raw text-sm truncate">{r.productTitle}</p>
                  <p className="text-xs font-bold text-cc-muted">{r.buyerName} wants to buy</p>
                </div>
                <span className="bru-btn h-8 px-3 text-xs bg-cc-orange text-black shrink-0">View offer</span>
              </Link>
            ))}
            {pendingRequests.length > 3 && (
              <Link href="/dashboard" className="text-xs font-bold underline hover:bg-black hover:text-white">+{pendingRequests.length - 3} more offers</Link>
            )}
          </div>
        )}

        {/* Messages */}
        {conversations.length > 0 ? (
          <ul className="space-y-3">
            {conversations.map(c => (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="bru-card bru-card-lift flex gap-3 p-3 hover:bg-[#fef9c3]">
                  <span aria-hidden className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border-2 border-black bg-cc-pink font-raw">{c.otherParty.charAt(0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-raw block truncate text-sm">{c.otherParty.split(" ")[0]} · {c.productTitle}</span>
                    <span className="block truncate text-xs font-bold text-cc-muted">{c.lastMessage ?? "No messages yet"}</span>
                  </span>
                  {c.unread && <span className="self-center border-2 border-black bg-cc-sky px-1 text-xs font-bold"><span aria-hidden>●</span><span className="sr-only">Unread</span></span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : pendingRequests.length === 0 ? (
          <div className="bru-card p-6 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-cc-muted" aria-hidden />
            <p className="font-raw mb-2 text-xl">No messages yet</p>
            <p className="text-lg font-bold text-cc-muted">When buyers reach out about your listings, they&apos;ll appear here.</p>
          </div>
        ) : null}
      </section>
      <section aria-labelledby="next-title" className="bru-card tilt-1 min-w-0 bg-[#1d4ed8] p-6 text-white md:p-8">
        <p id="next-title" className="font-raw mb-4 text-xs tracking-widest text-white">Next on campus</p>
        {next ? (
          <>
            <h3 className="font-raw mb-4 break-words text-xl text-white md:text-3xl">{next.productTitle}</h3>
            <p className="mb-6 flex items-center gap-2 text-xs font-bold text-white md:text-sm"><MapPin size={16} aria-hidden />Offer accepted. Agree a pickup spot in messages.</p>
            <Link href={`/messages?product=${next.productId}`} className="bru-btn h-11 bg-white px-4 text-xs text-black md:text-sm">Open chat</Link>
          </>
        ) : (
          <>
            <h3 className="font-raw mb-4 break-words text-xl text-white md:mb-6 md:text-3xl"><Resp mobile="No pickups scheduled" desktop="Nothing scheduled yet" /></h3>
            <p className="mb-6 flex items-center gap-2 text-xs font-bold text-white md:mb-8 md:text-sm"><MapPin size={16} aria-hidden />Accepted offers show up here.</p>
            <Link href="/marketplace" className="bru-btn h-11 bg-white px-4 text-xs text-black md:text-sm">Browse marketplace</Link>
          </>
        )}
      </section>
    </div>
  );
}
