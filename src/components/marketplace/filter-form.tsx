import Link from "next/link";
import { Search } from "lucide-react";
import { CONDITION_LABEL, CONDITION_VALUES, SORT_LABEL, SORT_VALUES, type SearchParams } from "@/lib/listing-format-types";

type Opt = { slug: string; name: string };

function SelectField({ label, name, value, children }: { label: string; name: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="font-raw mb-1 block text-xs">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="bru-input h-12 cursor-pointer py-0">{children}</select>
    </div>
  );
}

// A plain GET form: filters live in the URL, so results are shareable, bookmarkable and work without JS.
export function FilterForm({ p, categories, campuses }: { p: SearchParams; categories: Opt[]; campuses: Opt[] }) {
  const active = [p.q, p.category, p.condition, p.min, p.max].some(v => v !== undefined) || p.sort !== "newest";
  return (
    <form method="get" action="/marketplace" role="search" aria-label="Search and filter listings" className="bru-card space-y-5 p-5 sm:p-6">
      <div>
        <label htmlFor="f-q" className="font-raw mb-1 block text-sm">Search</label>
        <div className="flex gap-3">
          <input id="f-q" name="q" type="search" maxLength={80} defaultValue={p.q} placeholder="FIND SOMETHING SICK..." className="bru-input h-14" />
          <button type="submit" className="bru-btn h-14 shrink-0 bg-black px-5 text-white sm:px-7"><Search size={20} aria-hidden /><span className="font-raw hidden sm:inline">Seek</span><span className="sr-only sm:hidden">Search</span></button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-6">
        <SelectField label="Category" name="category" value={p.category}><option value="">All categories</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</SelectField>
        <SelectField label="Campus" name="campus" value={p.campus}><option value="all">All campuses</option>{campuses.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</SelectField>
        <SelectField label="Condition" name="condition" value={p.condition}><option value="">Any condition</option>{CONDITION_VALUES.map(c => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}</SelectField>
        <div>
          <label htmlFor="f-min" className="font-raw mb-1 block text-xs">Min ₹</label>
          <input id="f-min" name="min" type="number" inputMode="numeric" min={0} defaultValue={p.min} className="bru-input h-12 py-0" />
        </div>
        <div>
          <label htmlFor="f-max" className="font-raw mb-1 block text-xs">Max ₹</label>
          <input id="f-max" name="max" type="number" inputMode="numeric" min={0} defaultValue={p.max} className="bru-input h-12 py-0" />
        </div>
        <SelectField label="Sort by" name="sort" value={p.sort}>{SORT_VALUES.map(s => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}</SelectField>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="bru-btn h-12 bg-cc-orange px-6 text-base">Apply filters</button>
        {active && <Link href="/marketplace" className="font-bold underline decoration-2 underline-offset-4 hover:bg-black hover:text-white">Clear all</Link>}
      </div>
    </form>
  );
}
