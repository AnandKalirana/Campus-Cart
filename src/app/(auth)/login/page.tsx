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
    <AuthCard title="Welcome back" subtitle="Log in with your college email." footer={<>New here? <Link href="/register" className="font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Create an account</Link></>}>
      <LoginForm next={safeNextPath(next)} />
    </AuthCard>
  );
}
export default function Page(props: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<div className="h-96" aria-busy="true" />}><Body {...props} /></Suspense>;
}
