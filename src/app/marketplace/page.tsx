import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
export const metadata: Metadata = { title: "Marketplace" };
export default function Page() { return <ComingSoon title="Marketplace" phase="Phase 4" note="Search, filters and sorting arrive with database-backed listings. For now, browse the sample finds on the homepage." />; }
