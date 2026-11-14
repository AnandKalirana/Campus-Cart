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
    <form onSubmit={submit} role="search" className="relative max-w-2xl">
      <label htmlFor="hero-search" className="sr-only">Search listings</label>
      <input id="hero-search" type="search" value={q} onChange={e => setQ(e.target.value)} maxLength={100} autoComplete="off"
        placeholder="Find books, tech, gear…"
        className="bru-input !border-[6px] !py-5 !pl-5 !pr-36 font-raw !text-lg sm:!border-8 sm:!py-7 sm:!pr-48 sm:!text-2xl" />
      <button type="submit" className="bru-btn absolute right-3 top-1/2 h-12 -translate-y-1/2 bg-black px-5 text-lg text-white hover:!bg-white hover:!text-black sm:h-14 sm:px-9 sm:text-2xl">
        <Search size={20} aria-hidden /> Search
      </button>
    </form>
  );
}
