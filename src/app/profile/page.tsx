import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { ProfileContent } from "./profile-content";

export const metadata: Metadata = { title: "Profile & settings", robots: { index: false } };

async function Gate() {
  const user = await requireUser("/profile");
  return <ProfileContent user={user} />;
}

export default function Page() {
  return <Suspense fallback={<div className="h-64" aria-busy="true" />}><Gate /></Suspense>;
}