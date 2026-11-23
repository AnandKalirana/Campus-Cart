import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Cookie Notice", description: "The cookies Campus Cart uses." };

export default function Page() {
  return (
    <LegalPage title="Cookie Notice" updated="[DATE]">
      <section>
        <h2>Essential cookies only</h2>
        <p><strong>[TO VERIFY BEFORE LAUNCH]</strong> The Cloudflare Turnstile bot check on the log-in and sign-up pages is loaded from Cloudflare. Check in a real browser, and against Cloudflare&rsquo;s documentation, whether it sets cookies or uses browser storage, and update this page to match. This has not been verified.</p>
        <p>Campus Cart sets only the cookies it needs to work: the sign-in session cookie and the security cookies used by our sign-in library to protect login forms. They are HttpOnly, SameSite and, in production, Secure. Without them you cannot stay logged in.</p>
        <p>It also sets one preference cookie, <code>cc_campus</code>, when you pick a campus in the header. It stores only the campus you chose (for example <code>tcet-mumbai</code>) so the marketplace can show listings from that campus. It lasts one year, contains nothing personal, is never used for tracking, and you can delete it in your browser at any time (you will then see the default campus again). <strong>[REVIEW BEFORE LAUNCH]</strong> Have a legal reviewer confirm whether a preference cookie like this needs consent in your market.</p>
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
