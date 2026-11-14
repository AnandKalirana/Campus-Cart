import Link from "next/link";

export function ComingSoon({ title, phase, note }: { title: string; phase: string; note: string }) {
  return (
    <section className="mx-auto max-w-[760px] px-5 py-20 lg:py-28">
      <div className="bru-card p-7 sm:p-10">
        <p className="font-raw tilt-1 inline-block border-4 border-black bg-cc-yellow px-4 py-1 text-lg">{phase}</p>
        <h1 className="font-raw mt-6 text-[clamp(2rem,6vw,3.25rem)] leading-[0.95]">{title}</h1>
        <p className="mt-5 text-xl font-bold leading-snug">{note}</p>
        <Link href="/" className="bru-btn mt-8 h-14 bg-black px-8 text-xl text-white">Back to the marketplace</Link>
      </div>
    </section>
  );
}
