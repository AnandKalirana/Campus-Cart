import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
export const metadata: Metadata = { title: "Sell an item" };
export default function Page() { return <ComingSoon title="Sell an item" phase="Phase 3 and 4" note="Listing requires a verified student account. Authentication comes first, then the listing form." />; }
