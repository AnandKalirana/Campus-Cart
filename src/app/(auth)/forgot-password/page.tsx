import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { ForgotForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };
export default function Page() {
  return (
    <AuthCard title="Reset your password" subtitle="Enter your college email and we'll send a link." footer={<Link href="/login" className="font-bold underline underline-offset-4 decoration-2 hover:bg-black hover:text-white">Back to log in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
