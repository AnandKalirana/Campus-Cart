"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CAMPUSES } from "@/lib/catalog";

const STORAGE_KEY = "cc.campus";
const EVENT = "cc-campus-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVENT, cb); };
}
function readCampus(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (CAMPUSES as readonly string[]).includes(saved)) return saved;
  } catch {}
  return CAMPUSES[0];
}

export function CampusSelector() {
  const [open, setOpen] = useState(false);
  const campus = useSyncExternalStore(subscribe, readCampus, () => CAMPUSES[0]);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const choose = (c: string) => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(o => !o)}
        className="flex h-10 items-center gap-2.5 rounded-full bg-cc-surface px-4 text-[13px] font-medium transition-colors hover:bg-[#eaecf1]">
        <MapPin size={16} strokeWidth={1.75} className="text-cc-muted" aria-hidden />
        <span className="max-w-[180px] truncate">{campus}</span>
        <ChevronDown size={14} className="text-cc-muted" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul id={listId} role="listbox" aria-label="Select your campus"
            initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.98 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-cc-line bg-white p-1.5 shadow-[0_12px_32px_rgba(16,24,40,0.12)]">
            {CAMPUSES.map(c => (
              <li key={c} role="option" aria-selected={c === campus}>
                <button type="button" onClick={() => choose(c)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-cc-surface">
                  {c}{c === campus && <Check size={16} className="text-cc-blue" aria-hidden />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
