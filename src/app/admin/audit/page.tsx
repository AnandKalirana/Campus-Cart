import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { listAudit, PAGE } from "@/services/admin-service";
import { readQuery } from "@/lib/validation/admin";
import { Pager, fmtDate } from "@/components/admin/bits";

export const metadata: Metadata = { title: "Audit log" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const q = readQuery(await searchParams);
  const data = await listAudit(me, q.page);
  if (!data) return null;
  return (
    <>
      <h1 className="font-raw mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">Audit log</h1>
      {data.rows.length === 0 ? <p className="bru-card bg-white p-8 font-bold">No admin actions yet.</p> : (
        <div className="overflow-x-auto border-4 border-black bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Admin actions, newest first</caption>
            <thead><tr className="border-b-4 border-black"><th scope="col" className="p-3">When</th><th scope="col" className="p-3">Who</th><th scope="col" className="p-3">Action</th><th scope="col" className="p-3">Target</th><th scope="col" className="p-3">Detail</th></tr></thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.id} className="border-b-2 border-black align-top font-bold">
                  <td className="whitespace-nowrap p-3">{fmtDate(r.createdAt)}</td><td className="p-3">{r.actor?.name ?? "deleted user"}</td>
                  <td className="p-3">{r.action}</td><td className="p-3 [overflow-wrap:anywhere]">{r.targetType} {r.targetId.slice(0, 10)}…</td><td className="p-3 [overflow-wrap:anywhere]">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager base="/admin/audit" page={q.page} total={data.total} size={PAGE} />
    </>
  );
}
