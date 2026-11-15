"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CAMPUSES } from "@/lib/catalog";
import { campusShort, setCampus, useCampus } from "@/lib/campus-store";

/** `compact` shows the short code ("UW") to save header width; the full name stays in the accessible name. */
export function CampusSelector({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const campus = useCampus();
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
    setCampus(c);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(o => !o)}
        className="bru-btn h-12 w-full justify-start bg-white px-4 text-sm min-[1500px]:w-auto">
        <MapPin size={18} aria-hidden />
        {compact ? (
          <span title={campus}><span aria-hidden>{campusShort(campus)}</span><span className="sr-only">Campus: {campus}</span></span>
        ) : (
          <span title={campus} className="max-w-[240px] truncate">{campus}</span>
        )}
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
