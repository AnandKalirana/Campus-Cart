import Link from "next/link";
import { MapPin } from "lucide-react";
import { Resp } from "@/components/ui/resp";
import { SAMPLE_INBOX, SAMPLE_PICKUP } from "@/lib/dashboard-demo";

export function InboxAndPickup() {
  return (
    <div className="min-w-0 space-y-12">
      <section aria-labelledby="inbox-title">
        <div className="mb-6 flex items-center justify-between gap-4 md:mb-10">
          <h2 id="inbox-title" className="font-raw text-2xl md:text-4xl">The inbox</h2>
          <Link href="/messages" className="text-xs font-bold uppercase underline hover:bg-black hover:text-white md:text-sm"><Resp mobile="All" desktop="Messages" /></Link>
        </div>
        <ul className="space-y-3 md:space-y-5">
          {SAMPLE_INBOX.map((m, i) => (
            <li key={m.id} className={i > 0 ? "hidden md:block" : ""}>
              <Link href="/messages" className="bru-card bru-card-lift flex gap-4 p-4 hover:bg-[#fef9c3]">
                <span aria-hidden className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full border-2 border-black bg-cc-pink font-raw text-lg">{m.name.charAt(0)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2"><span className="font-raw text-sm">{m.name}</span><span className="text-xs font-bold text-cc-muted">{m.ago}</span></span>
                  <span className="mt-1 block truncate text-xs font-medium md:text-sm">{i === 0 ? <Resp mobile="Available for pickup today?" desktop={m.text} /> : m.text}</span>
                </span>
                {m.unread > 0 && <span className="grid h-6 min-w-6 place-items-center self-center border-2 border-black bg-cc-sky px-1 text-xs font-bold"><span aria-hidden>{m.unread}</span><span className="sr-only">{m.unread} unread</span></span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="next-title" className="bru-card tilt-1 min-w-0 bg-[#1d4ed8] p-6 text-white md:p-8">
        <p id="next-title" className="font-raw mb-4 text-xs tracking-widest text-white">Next on campus</p>
        <h3 className="font-raw mb-4 break-words text-xl text-white md:mb-6 md:text-3xl"><Resp mobile="Library pickup" desktop={SAMPLE_PICKUP.title} /></h3>
        <p className="mb-6 flex items-center gap-2 text-xs font-bold text-white md:mb-8 md:text-sm"><MapPin size={16} aria-hidden />{SAMPLE_PICKUP.place}</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="font-raw text-base md:text-xl">{SAMPLE_PICKUP.when}</span>
          <Link href="/messages" className="bru-btn h-11 bg-white px-4 text-xs text-black md:text-sm"><Resp mobile="Info" desktop="View info" /></Link>
        </div>
      </section>
    </div>
  );
}
