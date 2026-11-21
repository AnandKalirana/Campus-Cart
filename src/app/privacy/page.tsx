import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy", description: "What Campus Cart collects, why, and how to control it." };

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="[DATE]">
      <section>
        <h2>Who we are</h2>
        <p>Campus Cart is operated by [OPERATOR NAME AND LEGAL ENTITY], [ADDRESS]. Contact for privacy questions: [PRIVACY EMAIL].</p>
      </section>
      <section>
        <h2>What we collect, and why</h2>
        <ul>
          <li><strong>Account:</strong> your name, college email address, campus, and a salted hash of your password (we never store the password itself). Needed to verify you are a student and to run your account.</li>
          <li><strong>Listings:</strong> title, description, price, condition, pickup spot and photos. Photos are re-encoded on upload, which removes embedded metadata such as GPS location.</li>
          <li><strong>Messages and offers:</strong> the text you send to other students, offers you make or receive, and read status. Needed to let buyers and sellers arrange a pickup.</li>
          <li><strong>Wishlist and notifications:</strong> items you save and in-app notices.</li>
          <li><strong>Reports and moderation:</strong> reports you file, and actions moderators take, recorded in an audit log.</li>
          <li><strong>Technical logs:</strong> request ID, route, status and timing, used to keep the service running and to investigate abuse. Logs do not contain passwords, session cookies or message text. Retention: [LOG RETENTION PERIOD].</li>
        </ul>
        <p>We do not take payments, do not collect your precise location, and do not use advertising or analytics trackers.</p>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Other students on the site can see your first name, campus and your active listings.</li>
          <li>Messages are visible only to the two people in the conversation and, where needed to handle a report or abuse, to moderators.</li>
          <li>Your email address is not shown to other students.</li>
        </ul>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>We use [HOSTING PROVIDER] for hosting, Neon for the database, [OBJECT STORAGE PROVIDER] for photos and [EMAIL PROVIDER] to send verification and reset emails. They process data on our behalf. On the log-in and sign-up pages we also load Cloudflare Turnstile, a bot check run by Cloudflare. Your browser contacts Cloudflare directly, so Cloudflare receives your IP address and browser signals needed to tell people from bots. [REVIEW Cloudflare&rsquo;s current Turnstile data-processing terms and whether it stores anything in your browser before publishing.] We do not sell your data and we do not send your data to any AI provider.</p>
      </section>
      <section>
        <h2>Keeping and deleting data</h2>
        <p>We keep your account data while your account is open. You can download a copy of your data and permanently delete your account from your profile page; deletion also removes your listings, photos, saved items, offers and chats (the other student loses their copy of those chats). A short record that an account was deleted is kept, with no name or email. [PRIVACY EMAIL] for anything the page can&apos;t do. Backups roll off after [BACKUP RETENTION PERIOD].</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You can change your name and password in your <Link href="/profile">profile</Link>, remove listings at any time, and ask us for a copy of, or to correct or delete, your data at [PRIVACY EMAIL]. See also our <Link href="/cookies">cookie notice</Link>.</p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Connections use HTTPS, passwords are hashed, access to other users&rsquo; data is checked on the server, and sensitive actions are rate limited. No system is perfectly secure; report problems to [SECURITY EMAIL].</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>If we change this policy in a way that matters, we will tell you on the site before it applies.</p>
      </section>
    </LegalPage>
  );
}
