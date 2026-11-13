import Link from "next/link";

export function ComingSoon({ title, phase, note }: { title: string; phase: string; note: string }) {
  return (
    <section className="mx-auto max-w-[720px] px-5 py-24 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cc-blue">{phase}</p>
      <h1 className="mt-5 text-[36px] font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-cc-muted">{note}</p>
      <Link href="/" className="mt-8 inline-flex h-11 items-center rounded-full bg-cc-ink px-6 text-sm font-medium text-white">Back to the marketplace</Link>
    </section>
  );
}
