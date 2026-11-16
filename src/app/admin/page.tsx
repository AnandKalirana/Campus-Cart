import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { overview } from "@/services/admin-service";

export const metadata: Metadata = { title: "Overview" };

export default async function Page() {
  const me = await requireAdmin();
  const o = await overview(me);
  if (!o) return null;
  const cards = [
    ["Open reports", o.openReports, "/admin/reports"], ["Active listings", o.activeListings, "/admin/listings"],
    ["Users", o.users, "/admin/users"], ["Suspended users", o.suspended, "/admin/users?status=SUSPENDED"], ["Active campuses", o.campuses, "/admin/campuses"],
  ] as const;
  return (
    <>
      <h1 className="font-raw mb-8 text-[clamp(2rem,5vw,3.25rem)] leading-none">Overview</h1>
      <ul className="grid grid-cols-2 gap-6 lg:grid-cols-5">
        {cards.map(([label, n, href]) => (
          <li key={label}><Link href={href} className="bru-card bru-card-lift block bg-white p-5"><span className="font-raw block text-4xl">{n}</span><span className="text-sm font-bold">{label}</span></Link></li>
        ))}
      </ul>
    </>
  );
}
