import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { RegisterForm } from "@/components/forms/auth-forms";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Create account" };

async function Body() {
  // Only campuses that have verification domains configured can accept sign-ups.
  const campuses = await db().university.findMany({ where: { isActive: true, NOT: { emailDomains: { isEmpty: true } } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <AuthCard title="Join your campus" subtitle="Students only. We verify your college email." footer={<>Already have an account? <Link href="/login" className="font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Log in</Link></>}>
      {campuses.length ? <RegisterForm campuses={campuses} /> : <p className="bru-card p-4 text-base font-bold">No campuses are accepting sign-ups yet. An admin needs to add institutional email domains first.</p>}
    </AuthCard>
  );
}
export default function Page() { return <Suspense fallback={<div className="h-96" aria-busy="true" />}><Body /></Suspense>; }
