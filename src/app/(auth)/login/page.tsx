import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/ui/auth-card";
import { LoginForm } from "@/components/forms/auth-forms";
import { safeNextPath } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Log in" };

async function Body({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthCard title="Welcome back" subtitle="Log in with your college email." footer={<>New here? <Link href="/register" className="font-medium text-cc-blue hover:underline">Create an account</Link></>}>
      <LoginForm next={safeNextPath(next)} />
    </AuthCard>
  );
}
export default function Page(props: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<div className="h-96" aria-busy="true" />}><Body {...props} /></Suspense>;
}
