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
        className="bru-btn h-12 w-full justify-start bg-white px-4 text-sm min-[1400px]:w-auto">
        <MapPin size={18} aria-hidden />
        <span title={campus} className="max-w-[110px] truncate 2xl:max-w-[170px]">{campus}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul id={listId} role="listbox" aria-label="Select your campus"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }} transition={{ duration: 0.1, ease: "easeOut" }}
            className="bru-card absolute left-0 top-14 z-50 w-72 max-w-[calc(100vw-2.5rem)] p-1">
            {CAMPUSES.map(c => (
              <li key={c} role="option" aria-selected={c === campus}>
                <button type="button" onClick={() => choose(c)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-bold hover:bg-black hover:text-white">
                  {c}{c === campus && <Check size={18} aria-hidden />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
