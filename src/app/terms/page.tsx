import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Use", description: "The rules for using Campus Cart." };

export default function Page() {
  return (
    <LegalPage title="Terms of Use" updated="[DATE]">
      <section>
        <h2>What Campus Cart is</h2>
        <p>Campus Cart lets verified students list items and arrange to buy and sell them in person. We are a notice board, not a party to any sale: we do not take payments, hold money, ship items, inspect goods or guarantee anyone&rsquo;s identity beyond a verified college email.</p>
      </section>
      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be a current student with a college email address we accept, and give accurate information.</li>
          <li>Keep your password private. You are responsible for activity on your account.</li>
          <li>One person, one account.</li>
        </ul>
      </section>
      <section>
        <h2>Listings and meetups</h2>
        <ul>
          <li>List only things you own and may sell, described honestly, with your own photos.</li>
          <li>Not allowed: weapons, drugs, alcohol, stolen or counterfeit goods, exam papers or answers, anything illegal at your campus or in [JURISDICTION], and services that are not items.</li>
          <li>Agree prices and pay in person. Meet in public, well-lit campus places. See our <Link href="/safety">safety tips</Link>.</li>
          <li>Offers on Campus Cart are requests, not contracts; either side can decline.</li>
        </ul>
      </section>
      <section>
        <h2>Behaviour</h2>
        <p>No harassment, hate, spam, scams or attempts to break or overload the service. Do not share other people&rsquo;s private information. Moderators may remove listings, limit or suspend accounts that break these rules, and we keep a record of those actions.</p>
      </section>
      <section>
        <h2>Reports</h2>
        <p>If you see a problem, use &ldquo;Report this listing&rdquo; on the listing page. Reports are reviewed by people, not instantly.</p>
      </section>
      <section>
        <h2>Our responsibility</h2>
        <p>We work to keep the service running and safe but provide it &ldquo;as is&rdquo;. To the extent the law allows, we are not responsible for the condition of items, for what happens at meetups, or for losses between users. [LIABILITY AND GOVERNING LAW CLAUSE: to be written by a qualified person.]</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>[OPERATOR NAME], [ADDRESS], [CONTACT EMAIL].</p>
      </section>
    </LegalPage>
  );
}
