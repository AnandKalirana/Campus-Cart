"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Global error boundary: never shows stack traces, SQL or env details. Only the opaque digest is surfaced for support. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("ui_error", { digest: error.digest }); }, [error]);
  return (
    <section className="mx-auto max-w-[760px] px-5 py-20 lg:py-28">
      <div role="alert" className="bru-card p-7 sm:p-10">
        <p className="font-raw tilt-1 inline-block border-4 border-black bg-cc-red px-4 py-1 text-lg text-white">Something broke</p>
        <h1 className="font-raw mt-6 text-[clamp(2rem,6vw,3.25rem)] leading-[0.95]">We couldn&rsquo;t load that</h1>
        <p className="mt-5 text-xl font-bold leading-snug">That one&rsquo;s on us. Nothing you entered was lost or changed. Try again, or head back to the marketplace.</p>
        {error.digest && <p className="mt-4 text-sm font-bold">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-4">
          <button type="button" onClick={reset} className="bru-btn h-14 bg-black px-8 text-xl text-white">Try again</button>
          <Link href="/" className="bru-btn h-14 bg-white px-8 text-xl">Marketplace</Link>
        </div>
      </div>
    </section>
  );
}
