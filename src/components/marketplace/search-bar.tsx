"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim().slice(0, 100);
    router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : "/marketplace");
  };
  return (
    <form onSubmit={submit} role="search" className="flex items-center gap-2 rounded-2xl border border-cc-line bg-white p-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(10,96,232,0.15)]">
      <Search size={20} strokeWidth={1.5} className="shrink-0 text-cc-muted" aria-hidden />
      <label htmlFor="hero-search" className="sr-only">Search listings</label>
      <input id="hero-search" type="search" value={q} onChange={e => setQ(e.target.value)} maxLength={100} autoComplete="off"
        placeholder="Search books, tech, and everything in between"
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[13px] outline-none placeholder:text-cc-muted" />
      <button type="submit" className="h-11 shrink-0 rounded-xl bg-cc-blue px-6 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-cc-blue-hover active:scale-[0.97]">Search</button>
    </form>
  );
}
