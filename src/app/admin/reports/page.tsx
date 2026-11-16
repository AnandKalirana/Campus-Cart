import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listReports, PAGE } from "@/services/admin-service";
import { readQuery } from "@/lib/validation/admin";
import { resolveReportAction } from "../actions";
import { AdminForm } from "@/components/admin/admin-form";
import { Pager, Pill, fmtDate } from "@/components/admin/bits";

export const metadata: Metadata = { title: "Reports" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const q = readQuery(await searchParams);
  const status = q.status === "DISMISSED" || q.status === "ACTIONED" ? q.status : "OPEN";
  const data = await listReports(me, status, q.page);
  if (!data) return null;
  return (
    <>
      <h1 className="font-raw mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">Reports</h1>
      <nav aria-label="Report status" className="mb-6 flex gap-3">
        {(["OPEN", "ACTIONED", "DISMISSED"] as const).map(s => <Link key={s} href={`/admin/reports?status=${s}`} aria-current={s === status ? "page" : undefined} className={`bru-btn h-10 px-4 text-sm ${s === status ? "bg-black text-white" : "bg-white"}`}>{s === "OPEN" ? "Open" : s === "ACTIONED" ? "Actioned" : "Dismissed"}</Link>)}
      </nav>
      {data.rows.length === 0 && <p className="bru-card bg-white p-8 font-bold">{status === "OPEN" ? "Nothing to review. Nice." : "Nothing here."}</p>}
      <ul className="space-y-6">
        {data.rows.map(r => (
          <li key={r.id} className="bru-card bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-raw text-lg [overflow-wrap:anywhere]"><Link href={`/products/${r.product.id}`} className="underline decoration-2 underline-offset-4">{r.product.title}</Link></h2>
              <Pill tone={r.product.status === "REMOVED" ? "red" : "white"}>{r.product.status}</Pill>
              {r.product._count.reports > 1 && <Pill tone="yellow">{r.product._count.reports} reports</Pill>}
            </div>
            <p className="mt-2 text-sm font-bold">Seller: {r.product.seller.name}{r.product.seller.status === "SUSPENDED" ? " (suspended)" : ""} · Reported by {r.reporter.name} · {fmtDate(r.createdAt)}</p>
            {/* Plain text only; React escapes it. */}
            <blockquote className="mt-3 border-l-8 border-black pl-4 font-bold [overflow-wrap:anywhere]">{r.reason}</blockquote>
            {r.status === "OPEN" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <AdminForm action={resolveReportAction} fields={{ reportId: r.id, decision: "dismiss" }} label="Why dismiss? (logged)" submit="Dismiss" />
                <AdminForm action={resolveReportAction} fields={{ reportId: r.id, decision: "remove_listing" }} label="Why remove the listing? (seller is told)" submit="Remove listing" tone="danger" />
              </div>
            ) : <p className="mt-3 text-sm font-bold">{r.status} by {r.resolvedBy?.name ?? "unknown"}{r.resolvedAt ? ` · ${fmtDate(r.resolvedAt)}` : ""}</p>}
          </li>
        ))}
      </ul>
      <Pager base="/admin/reports" page={q.page} total={data.total} size={PAGE} params={{ status }} />
    </>
  );
}
