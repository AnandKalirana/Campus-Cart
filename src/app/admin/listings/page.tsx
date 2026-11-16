import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listListings, PAGE } from "@/services/admin-service";
import { readQuery } from "@/lib/validation/admin";
import { formatINR } from "@/lib/catalog";
import { moderateListingAction } from "../actions";
import { AdminForm } from "@/components/admin/admin-form";
import { Pager, Pill, SearchForm, fmtDate } from "@/components/admin/bits";

export const metadata: Metadata = { title: "Listings" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const q = readQuery(await searchParams);
  const data = await listListings(me, q.q, q.status, q.page);
  if (!data) return null;
  return (
    <>
      <h1 className="font-raw mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">Listings</h1>
      <SearchForm q={q.q} status={q.status} statuses={["ACTIVE", "PAUSED", "SOLD", "REMOVED"]} placeholder="Title, seller name or email" />
      {data.rows.length === 0 && <p className="bru-card bg-white p-8 font-bold">No listings match.</p>}
      <ul className="space-y-5">
        {data.rows.map(p => (
          <li key={p.id} className="bru-card bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-raw text-lg [overflow-wrap:anywhere]"><Link href={`/products/${p.id}`} className="underline decoration-2 underline-offset-4">{p.title}</Link></h2>
              <Pill tone={p.status === "REMOVED" ? "red" : p.status === "ACTIVE" ? "green" : "white"}>{p.status}</Pill>
              {p._count.reports > 0 && <Pill tone="yellow">{p._count.reports} open report{p._count.reports > 1 ? "s" : ""}</Pill>}
            </div>
            <p className="mt-1 text-sm font-bold">{formatINR(p.price)} · {p.seller.name} ({p.seller.email}){p.seller.status === "SUSPENDED" ? " · suspended" : ""} · {fmtDate(p.createdAt)}</p>
            <div className="mt-4">
              {p.status === "REMOVED"
                ? <AdminForm action={moderateListingAction} fields={{ productId: p.id, decision: "restore" }} label="Why restore? (seller is told)" submit="Restore (as paused)" />
                : <AdminForm action={moderateListingAction} fields={{ productId: p.id, decision: "remove" }} label="Why remove? (seller is told)" submit="Remove" tone="danger" />}
            </div>
          </li>
        ))}
      </ul>
      <Pager base="/admin/listings" page={q.page} total={data.total} size={PAGE} params={{ q: q.q, status: q.status }} />
    </>
  );
}
