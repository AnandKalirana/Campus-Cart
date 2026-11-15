"use client";
import { useSyncExternalStore } from "react";
import { CAMPUSES, CAMPUS_SHORT } from "@/lib/catalog";

export const CAMPUS_STORAGE_KEY = "cc.campus";
export const CAMPUS_EVENT = "cc-campus-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CAMPUS_EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(CAMPUS_EVENT, cb); };
}
function read(): string {
  try {
    const saved = localStorage.getItem(CAMPUS_STORAGE_KEY);
    if (saved && (CAMPUSES as readonly string[]).includes(saved)) return saved;
  } catch {}
  return CAMPUSES[0];
}

/** The campus the visitor picked (stored per-browser only). Server render and first paint use the default campus. */
export function useCampus(): string {
  return useSyncExternalStore(subscribe, read, () => CAMPUSES[0]);
}
export function setCampus(c: string) {
  try { localStorage.setItem(CAMPUS_STORAGE_KEY, c); } catch {}
  window.dispatchEvent(new Event(CAMPUS_EVENT));
}
export function campusShort(name: string): string {
  return CAMPUS_SHORT[name as keyof typeof CAMPUS_SHORT] ?? name;
}

/** Inline short campus name for copy, e.g. "UW". */
export function CampusShort() { return <>{campusShort(useCampus())}</>; }
