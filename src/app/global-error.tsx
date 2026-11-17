"use client";

/** Last-resort boundary (used when the root layout itself fails). Self-contained: no app components, no details leaked. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#e5e5e5", color: "#000", margin: 0 }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
          <div role="alert" style={{ border: "4px solid #000", background: "#fff", padding: "2rem" }}>
            <h1 style={{ margin: 0, fontSize: "2rem" }}>Campus Cart hit a problem</h1>
            <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>Nothing you entered was changed. Please try again in a moment.</p>
            {error.digest && <p style={{ fontSize: "0.875rem" }}>Reference: {error.digest}</p>}
            <button type="button" onClick={reset} style={{ marginTop: "1rem", border: "4px solid #000", background: "#000", color: "#fff", padding: "0.75rem 1.5rem", fontSize: "1.125rem", fontWeight: 700, cursor: "pointer" }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
