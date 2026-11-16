import Link from "next/link";

export const fmtDate = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export function Pill({ children, tone = "white" }: { children: React.ReactNode; tone?: "white" | "red" | "green" | "yellow" }) {
  const bg = { white: "bg-white", red: "bg-cc-pink", green: "bg-cc-green", yellow: "bg-cc-yellow" }[tone];
  return <span className={`font-raw inline-block border-2 border-black px-2 py-0.5 text-xs text-black ${bg}`}>{children}</span>;
}

export function SearchForm({ q, status, statuses, placeholder }: { q?: string; status?: string; statuses?: string[]; placeholder: string }) {
  return (
    <form role="search" className="mb-6 flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <label htmlFor="q" className="mb-1 block text-sm font-bold">Search</label>
        <input id="q" name="q" defaultValue={q} maxLength={80} placeholder={placeholder} className="bru-input h-11 w-full" />
      </div>
      {statuses && (
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-bold">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="bru-input h-11 min-w-[8rem] text-base"><option value="">All</option>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
      )}
      <button type="submit" className="bru-btn h-11 bg-black px-6 text-sm text-white">Search</button>
    </form>
  );
}

export function Pager({ base, page, total, size, params = {} }: { base: string; page: number; total: number; size: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (n: number) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(params)) if (v) u.set(k, v); u.set("page", String(n)); return `${base}?${u}`; };
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center gap-4 text-sm font-bold">
      {page > 1 ? <Link href={href(page - 1)} className="bru-btn h-10 bg-white px-4">Previous</Link> : <span aria-hidden className="w-24" />}
      <span>Page {page} of {pages} · {total} total</span>
      {page < pages && <Link href={href(page + 1)} className="bru-btn h-10 bg-white px-4">Next</Link>}
    </nav>
  );
}
