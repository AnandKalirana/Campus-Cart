"use client";
import { useEffect, useRef, useState } from "react";

// Public by design: the site key is rendered into the page. The SECRET key never reaches the browser.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(el: HTMLElement, opts: { sitekey: string; callback: () => void; "expired-callback": () => void; "error-callback": () => void; "timeout-callback": () => void }): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global { interface Window { turnstile?: TurnstileApi } }

let scriptPromise: Promise<TurnstileApi> | undefined;
function loadScript(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement("script");
    s.src = SCRIPT_SRC; s.async = true; s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => { scriptPromise = undefined; reject(new Error("turnstile blocked")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile challenge. Must be rendered INSIDE the <form>: the widget adds a hidden `cf-turnstile-response`
 * input, which the server action verifies. Tokens are single use, so pass `resetKey` (e.g. the action state) and the
 * widget fetches a fresh one after every submission. Renders nothing when no site key is configured (local development).
 */
export function TurnstileField({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "expired" | "error">("loading");

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    const el = box.current;
    loadScript().then(api => {
      if (cancelled) return;
      widget.current = api.render(el, {
        sitekey: SITE_KEY,
        callback: () => setStatus("ready"),
        "expired-callback": () => setStatus("expired"),
        "timeout-callback": () => setStatus("expired"),
        "error-callback": () => setStatus("error"),
      });
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; if (widget.current && window.turnstile) window.turnstile.remove(widget.current); widget.current = undefined; };
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (widget.current && window.turnstile) { setStatus("loading"); window.turnstile.reset(widget.current); }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <div role="group" aria-labelledby="security-check-label">
      <p id="security-check-label" className="font-raw mb-2 text-sm">Security check</p>
      <div ref={box} />
      <p className="mt-2 text-sm font-bold" role="status" aria-live="polite">
        {status === "loading" && "Checking that you're a person…"}
        {status === "ready" && "Check complete."}
        {status === "expired" && "The check expired. It will refresh automatically; if not, reload the page."}
        {status === "error" && "The security check couldn't load. Turn off content blockers for this site, then reload the page."}
      </p>
    </div>
  );
}
