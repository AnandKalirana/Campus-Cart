"use client";
import { useSyncExternalStore } from "react";
import { CAMPUSES, CAMPUS_SHORT, CAMPUS_SLUG } from "@/lib/campuses";
import { CAMPUS_COOKIE } from "@/lib/campus-cookie";

/** Old storage key (before the server needed to know the campus). Read once to migrate, then never written. */
export const CAMPUS_STORAGE_KEY = "cc.campus";
export const CAMPUS_EVENT = "cc-campus-change";

type CampusName = (typeof CAMPUSES)[number];
const nameForSlug = (slug: string | undefined): CampusName | undefined => CAMPUSES.find(c => CAMPUS_SLUG[c] === slug);

function cookieSlug(): string | undefined {
  const m = document.cookie.split("; ").find(c => c.startsWith(`${CAMPUS_COOKIE}=`));
  return m ? decodeURIComponent(m.slice(CAMPUS_COOKIE.length + 1)) : undefined;
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CAMPUS_EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(CAMPUS_EVENT, cb); };
}
function read(): string {
  try {
    const fromCookie = nameForSlug(cookieSlug());
    if (fromCookie) return fromCookie;
    const legacy = localStorage.getItem(CAMPUS_STORAGE_KEY);
    if (legacy && (CAMPUSES as readonly string[]).includes(legacy)) return legacy;
  } catch {}
  return CAMPUSES[0];
}

/** The campus the visitor picked. The choice lives in a cookie so the server filters listings by it too. Server render and first paint use the default campus. */
export function useCampus(): string {
  return useSyncExternalStore(subscribe, read, () => CAMPUSES[0]);
}

/** True when an earlier version saved a campus in localStorage but no cookie exists yet (the server has not seen the choice). */
export function legacyCampusToMigrate(): string | null {
  try {
    if (cookieSlug()) return null;
    const legacy = localStorage.getItem(CAMPUS_STORAGE_KEY);
    return legacy && (CAMPUSES as readonly string[]).includes(legacy) ? legacy : null;
  } catch { return null; }
}

export function setCampus(c: string) {
  const slug = CAMPUS_SLUG[c as CampusName];
  if (!slug) return; // never store anything that isn't a known campus
  // Not a secret and not personal data: a preference. Lax + 1 year, readable by the server on the next request.
  document.cookie = `${CAMPUS_COOKIE}=${encodeURIComponent(slug)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event(CAMPUS_EVENT));
}
export function campusShort(name: string): string {
  return CAMPUS_SHORT[name as keyof typeof CAMPUS_SHORT] ?? name;
}

/** Inline short campus name for copy, e.g. "UW". */
export function CampusShort() { return <>{campusShort(useCampus())}</>; }
