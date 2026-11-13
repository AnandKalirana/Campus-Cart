import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageCircle, Camera, HandHeart } from "lucide-react";

export const metadata: Metadata = { title: "How it works", description: "List in a minute, chat with verified students, and meet locally. Campus Cart in four steps." };

const STEPS = [
  { icon: BadgeCheck, title: "Verify you're a student", body: "Sign up with your college email. Institutions are configured by domain, so it works for your campus." },
  { icon: Camera, title: "List in a minute", body: "Add a few photos, a fair price and a pickup spot. Listing is always free." },
  { icon: MessageCircle, title: "Meet your buyer", body: "Chat with verified students and agree on a time and place." },
  { icon: HandHeart, title: "Pass it forward", body: "Meet locally, hand it over, and mark it sold. No shipping, no payment handled by Campus Cart." },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1312px] px-5 py-16 lg:px-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cc-blue">How it works</p>
      <h1 className="mt-5 max-w-[640px] text-[40px] font-semibold leading-[1.1] tracking-[-0.035em]">A second life for student essentials, in four steps.</h1>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-[20px] bg-cc-surface p-6">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-cc-blue"><Icon size={20} strokeWidth={1.5} aria-hidden /></span>
            <p className="mt-6 text-xs text-cc-muted">0{i + 1}</p>
            <h2 className="mt-1 text-[17px] font-semibold">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-cc-muted">{body}</p>
          </li>
        ))}
      </ol>
      <Link href="/" className="mt-10 inline-flex h-11 items-center rounded-full bg-cc-ink px-6 text-sm font-medium text-white">Browse the marketplace</Link>
    </section>
  );
}
