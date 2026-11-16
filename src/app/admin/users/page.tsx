import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { listUsers, PAGE } from "@/services/admin-service";
import { readQuery } from "@/lib/validation/admin";
import { moderateUserAction } from "../actions";
import { AdminForm } from "@/components/admin/admin-form";
import { Pager, Pill, SearchForm, fmtDate } from "@/components/admin/bits";

export const metadata: Metadata = { title: "Users" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const q = readQuery(await searchParams);
  const data = await listUsers(me, q.q, q.status, q.page);
  if (!data) return null;
  return (
    <>
      <h1 className="font-raw mb-6 text-[clamp(2rem,5vw,3.25rem)] leading-none">Users</h1>
      <SearchForm q={q.q} status={q.status} statuses={["ACTIVE", "SUSPENDED"]} placeholder="Name or email" />
      {data.rows.length === 0 && <p className="bru-card bg-white p-8 font-bold">No users match.</p>}
      <ul className="space-y-5">
        {data.rows.map(u => (
          <li key={u.id} className="bru-card bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-raw text-lg [overflow-wrap:anywhere]">{u.name}</h2>
              {u.role === "ADMIN" && <Pill tone="yellow">ADMIN</Pill>}
              <Pill tone={u.status === "SUSPENDED" ? "red" : "green"}>{u.status}</Pill>
              {!u.emailVerified && <Pill>UNVERIFIED</Pill>}
            </div>
            <p className="mt-1 text-sm font-bold [overflow-wrap:anywhere]">{u.email} · {u.university?.name ?? "No campus"} · {u._count.products} listing{u._count.products === 1 ? "" : "s"} · joined {fmtDate(u.createdAt)}</p>
            {u.role !== "ADMIN" && u.id !== me.id && (
              <div className="mt-4">
                {u.status === "SUSPENDED"
                  ? <AdminForm action={moderateUserAction} fields={{ userId: u.id, decision: "reinstate" }} label="Why reinstate? (logged)" submit="Reinstate" />
                  : <AdminForm action={moderateUserAction} fields={{ userId: u.id, decision: "suspend" }} label="Why suspend? (logged; signs them out)" submit="Suspend" tone="danger" />}
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pager base="/admin/users" page={q.page} total={data.total} size={PAGE} params={{ q: q.q, status: q.status }} />
    </>
  );
}
