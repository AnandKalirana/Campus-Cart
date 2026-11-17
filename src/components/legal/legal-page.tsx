import type { ReactNode } from "react";

/** Shared shell for the legal pages. Content is DRAFT until the operator fills the placeholders and a qualified person reviews it. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[760px] px-5 py-14 lg:py-20">
      <p role="note" className="mb-8 border-4 border-black bg-cc-yellow p-4 text-sm font-bold text-black">
        DRAFT. This text describes what the app actually does today, but it has not been reviewed by a lawyer. Items in [SQUARE BRACKETS] are placeholders the operator must fill in before launch.
      </p>
      <h1 className="font-raw text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">{title}</h1>
      <p className="mt-3 text-sm font-bold">Last updated: {updated}</p>
      <div className="legal mt-10 space-y-8 text-lg leading-relaxed [&_h2]:font-raw [&_h2]:mb-3 [&_h2]:text-2xl [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:font-bold [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-4">{children}</div>
    </article>
  );
}
