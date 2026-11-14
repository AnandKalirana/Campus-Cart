import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageCircle, Camera, HandHeart } from "lucide-react";

export const metadata: Metadata = { title: "How it works", description: "List in a minute, chat with verified students, and meet locally. Campus Cart in four steps." };

const STEPS = [
  { icon: BadgeCheck, title: "Verify you're a student", body: "Sign up with your college email. Institutions are configured by domain, so it works for your campus.", tint: "bg-cc-sky" },
  { icon: Camera, title: "List in a minute", body: "Add a few photos, a fair price and a pickup spot. Listing is always free.", tint: "bg-cc-yellow" },
  { icon: MessageCircle, title: "Meet your buyer", body: "Chat with verified students and agree on a time and place.", tint: "bg-cc-pink" },
  { icon: HandHeart, title: "Pass it forward", body: "Meet locally, hand it over, and mark it sold. No shipping, no payment handled by Campus Cart.", tint: "bg-cc-green" },
];

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-14 lg:px-6 lg:py-20">
      <p className="font-raw tilt-1 inline-block border-4 border-black bg-cc-green px-4 py-1 text-lg">How it works</p>
      <h1 className="font-raw mt-8 max-w-4xl text-[clamp(2.25rem,6.5vw,5rem)] leading-[0.92]">A second life for student essentials, in four steps.</h1>
      <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body, tint }, i) => (
          <li key={title} className={`bru-card bru-card-lift p-6 ${tint} ${i % 2 ? "tilt-2" : "tilt-1"} untilt`}>
            <span className="grid h-12 w-12 place-items-center border-4 border-black bg-white"><Icon size={24} aria-hidden /></span>
            <p className="font-raw mt-6 text-5xl" aria-hidden>0{i + 1}</p>
            <h2 className="font-raw mt-2 text-2xl leading-none">{title}</h2>
            <p className="mt-4 text-base font-bold leading-snug">{body}</p>
          </li>
        ))}
      </ol>
      <Link href="/" className="bru-btn mt-14 h-14 bg-black px-8 text-xl text-white">Browse the marketplace</Link>
    </section>
  );
}
