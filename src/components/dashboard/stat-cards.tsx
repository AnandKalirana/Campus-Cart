import { Resp } from "@/components/ui/resp";
import { formatINR } from "@/lib/catalog";
import { SAMPLE_STATS as S } from "@/lib/dashboard-demo";

const pad = (n: number) => String(n).padStart(2, "0");

export function StatCards() {
  const cards = [
    { label: "Active listings", value: pad(S.active), note: <Resp mobile="In play" desktop="Getting attention" />, chip: "bg-cc-yellow", card: "tilt-1" },
    { label: "Unread msgs", value: pad(S.unread), note: <Resp mobile="New talk" desktop={`${S.conversations} conversations`} />, chip: "bg-cc-sky", card: "bg-[#dbeafe]" },
    { label: "Total earned", value: formatINR(S.earned), note: <Resp mobile="30d stack" desktop="Last 30 days" />, chip: "bg-cc-green", card: "tilt-2" },
    { label: "Saved finds", value: pad(S.saved), note: <Resp mobile="Must-haves" desktop="Campus must-haves" />, chip: "bg-cc-pink", card: "" },
  ];
  return (
    <ul className="mb-12 grid grid-cols-1 gap-5 md:mb-20 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-10">
      {cards.map(c => (
        <li key={c.label} className={`bru-card bru-card-lift p-6 md:p-8 ${c.card}`}>
          <p className={`font-raw inline-block border-2 border-black px-2 py-0.5 text-xs ${c.chip}`}>{c.label}</p>
          <p className="mt-4 flex flex-wrap items-end gap-x-3">
            <span className="font-raw text-4xl md:text-6xl">{c.value}</span>
            <span className="pb-1 text-[11px] font-bold md:pb-2 md:text-xs">{c.note}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
