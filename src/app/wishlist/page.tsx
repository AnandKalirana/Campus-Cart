import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";
export const metadata: Metadata = { title: "Wishlist" };
export default function Page() { return <ComingSoon title="Wishlist" phase="Phase 5" note="Saved finds will sync to your student account." />; }
