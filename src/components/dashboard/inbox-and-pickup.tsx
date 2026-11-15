import Link from "next/link";
import { MapPin, Mail } from "lucide-react";
import { Resp } from "@/components/ui/resp";

interface InboxAndPickupProps {
  conversations: {
    active: import("@/services/listing-service").ListingCardData[];
    draft: import("@/services/listing-service").ListingCardData[];
    sold: import("@/services/listing-service").ListingCardData[];
  };
}

export function InboxAndPickup({ conversations }: InboxAndPickupProps) {
  const activeCount = conversations.active.length;

  return (
    <div className="min-w-0 space-y-12">
      <section aria-labelledby="inbox-title">
        <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
          <h2 id="inbox-title" className="font-raw text-2xl md:text-4xl">The inbox</h2>
          <Link href="/messages" className="text-xs font-bold uppercase underline hover:bg-black hover:text-white md:text-sm"><Resp mobile="All" desktop="Messages" /></Link>
        </div>
        {activeCount > 0 ? (
          <p className="bru-card p-6 text-center">
            <Mail className="mx-auto h-12 w-12 text-cc-muted mb-4" aria-hidden />
            <p className="font-raw text-xl mb-2">No messages yet</p>
            <p className="text-lg font-bold text-cc-muted">When buyers reach out about your {activeCount} active listing{activeCount === 1 ? "" : "s"}, they&apos;ll appear here.</p>
          </p>
        ) : (
          <p className="bru-card p-6 text-center">
            <Mail className="mx-auto h-12 w-12 text-cc-muted mb-4" aria-hidden />
            <p className="font-raw text-xl mb-2">No active listings</p>
            <p className="text-lg font-bold text-cc-muted">List something and buyers can message you here.</p>
            <Link href="/sell" className="bru-btn mt-4 h-12 bg-cc-orange px-6 text-base inline-flex">Create listing</Link>
          </p>
        )}
      </section>
      <section aria-labelledby="next-title" className="bru-card tilt-1 min-w-0 bg-[#1d4ed8] p-6 text-white md:p-8">
        <p id="next-title" className="font-raw mb-4 text-xs tracking-widest text-white">Next on campus</p>
        <h3 className="font-raw mb-4 break-words text-xl text-white md:mb-6 md:text-3xl"><Resp mobile="No pickups scheduled" desktop="Nothing scheduled yet" /></h3>
        <p className="mb-6 flex items-center gap-2 text-xs font-bold text-white md:mb-8 md:text-sm"><MapPin size={16} aria-hidden />Meet in a busy campus spot when you sell something</p>
        <Link href="/sell" className="bru-btn h-11 bg-white px-4 text-xs text-black md:text-sm"><Resp mobile="List item" desktop="List something new" /></Link>
      </section>
    </div>
  );
}
