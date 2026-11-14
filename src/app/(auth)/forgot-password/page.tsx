import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/ui/auth-card";
import { ForgotForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };
export default function Page() {
  return (
    <AuthCard title="Reset your password" subtitle="Enter your college email and we'll send a link." footer={<Link href="/login" className="font-medium text-cc-blue hover:underline">Back to log in</Link>}>
      <ForgotForm />
    </AuthCard>
  );
}
