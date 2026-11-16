import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

const NAV = [["/admin", "Overview"], ["/admin/reports", "Reports"], ["/admin/listings", "Listings"], ["/admin/users", "Users"], ["/admin/campuses", "Campuses"], ["/admin/audit", "Audit log"]] as const;

// The gate runs on every request for every /admin page (non-admins are redirected before any child renders).
// Each service call re-checks the admin role in the database as well, so this is not the only line of defence.
async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 lg:px-6">
      <p className="font-raw mb-2 text-sm">ADMIN_ONLY</p>
      <nav aria-label="Admin" className="mb-10 flex flex-wrap gap-3">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="bru-btn h-11 bg-white px-5 text-sm">{label}</Link>)}
      </nav>
      <Suspense fallback={<div className="h-64" aria-busy="true" />}><Gate>{children}</Gate></Suspense>
    </section>
  );
}
