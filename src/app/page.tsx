import { Hero } from "@/components/marketplace/hero";
import { CategoryRail } from "@/components/marketplace/category-rail";
import { FreshFinds } from "@/components/marketplace/fresh-finds";
import { SellPromo } from "@/components/marketplace/sell-promo";

// `/` is the marketplace homepage itself: no gate, no onboarding page. Browsing needs no account.
export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryRail />
      <FreshFinds />
      <SellPromo />
    </>
  );
}
