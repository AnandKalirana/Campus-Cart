import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
export const metadata: Metadata = { title: "Messages" };
export default function Page() { return <ComingSoon title="Messages" phase="Phase 5" note="Chat with sellers will live here once accounts are ready." />; }
