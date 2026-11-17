import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Cookie Notice", description: "The cookies Campus Cart uses." };

export default function Page() {
  return (
    <LegalPage title="Cookie Notice" updated="[DATE]">
      <section>
        <h2>Essential cookies only</h2>
        <p>Campus Cart sets only the cookies it needs to work: the sign-in session cookie and the security cookies used by our sign-in library to protect login forms. They are HttpOnly, SameSite and, in production, Secure. Without them you cannot stay logged in.</p>
      </section>
      <section>
        <h2>No tracking</h2>
        <p>We do not use analytics, advertising or social-media trackers, so there is nothing to opt in or out of today. If that changes, we will ask for your consent first and add a settings control here.</p>
      </section>
      <section>
        <h2>More</h2>
        <p>See the <Link href="/privacy">Privacy Policy</Link> for how we handle your data.</p>
      </section>
    </LegalPage>
  );
}
