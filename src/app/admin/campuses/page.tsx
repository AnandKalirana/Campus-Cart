import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { listCampuses } from "@/services/admin-service";
import { CampusForm } from "@/components/admin/campus-form";
import { Pill } from "@/components/admin/bits";

export const metadata: Metadata = { title: "Campuses" };

export default async function Page() {
  const me = await requireAdmin();
  const campuses = await listCampuses(me);
  if (!campuses) return null;
  return (
    <>
      <h1 className="font-raw mb-2 text-[clamp(2rem,5vw,3.25rem)] leading-none">Campuses</h1>
      <p className="mb-8 max-w-[60ch] text-sm font-bold">Only people whose email ends in one of a campus&apos;s domains can verify for it. Changing domains does not affect existing accounts.</p>
      <section aria-labelledby="add" className="bru-card mb-10 bg-white p-5">
        <h2 id="add" className="font-raw mb-4 text-xl">Add a campus</h2>
        <CampusForm />
      </section>
      <ul className="space-y-6">
        {campuses.map(c => (
          <li key={c.id} className="bru-card bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="font-raw text-xl">{c.name}</h2>
              <Pill tone={c.isActive ? "green" : "red"}>{c.isActive ? "ACTIVE" : "INACTIVE"}</Pill>
              <span className="text-sm font-bold">{c._count.users} users · {c._count.products} listings</span>
            </div>
            <CampusForm campus={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
