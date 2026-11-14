import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { ResetForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

async function Body({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      {token ? <ResetForm token={token} /> : <p className="text-sm text-cc-muted">This link is missing its token. <Link href="/forgot-password" className="text-cc-blue hover:underline">Request a new one</Link>.</p>}
    </AuthCard>
  );
}
export default function Page(props: { searchParams: Promise<{ token?: string }> }) {
  return <Suspense fallback={<div className="h-96" aria-busy="true" />}><Body {...props} /></Suspense>;
}
