import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { VerifyButton } from "./verify-button";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

// Verification happens on an explicit button press (POST), not on page load, so link scanners
// and email prefetchers that open the URL can't burn the one-time token.
async function Body({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Verify your email">
      {token ? <VerifyButton token={token} /> : <p className="text-sm text-cc-muted">This link is missing its token. <Link href="/login" className="text-cc-blue hover:underline">Log in</Link> to request another.</p>}
    </AuthCard>
  );
}
export default function Page(props: { searchParams: Promise<{ token?: string }> }) {
  return <Suspense fallback={<div className="h-48" aria-busy="true" />}><Body {...props} /></Suspense>;
}
