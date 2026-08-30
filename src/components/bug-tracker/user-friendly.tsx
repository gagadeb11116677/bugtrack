"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X, Sparkles, Search, ArrowDown, ArrowUp } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["/"], desc: "Fokus pencarian", icon: Search },
  { keys: ["J"], desc: "Laporan berikutnya (admin)", icon: ArrowDown },
  { keys: ["K"], desc: "Laporan sebelumnya (admin)", icon: ArrowUp },
  { keys: ["?"], desc: "Buka bantuan ini", icon: Keyboard },
  { keys: ["Esc"], desc: "Tutup dialog / popover", icon: X },
];

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" /> Pintasan keyboard
          </DialogTitle>
          <DialogDescription>Gesit ngakses bugtrack tanpa mouse.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys[0]} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.desc}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-sm">
                    {k}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-center font-mono text-[10px] text-muted-foreground">Tekan ? kapan aja buat buka lagi</p>
      </DialogContent>
    </Dialog>
  );
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

const HINT_KEY = "bugtrack:onboarded";

/** One-time onboarding hint shown on first visit (localStorage-gated). */
export function OnboardingHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // async to avoid setState-sync-in-effect lint; only show if not onboarded yet
    queueMicrotask(() => {
      try { if (!localStorage.getItem(HINT_KEY)) setShow(true); } catch { /* ignore */ }
    });
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-md border border-primary/30 bg-gradient-to-r from-primary/5 to-orange-500/5 p-3.5"
        >
          <button type="button" onClick={dismiss} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground" aria-label="Tutup">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-2.5 pr-6">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Selamat datang di bugtrack! 👋</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pilih produk (Script JPM / Script MD) → isi judul + screenshot + deskripsi → kirim. Tekan <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">?</kbd> kapan aja buat liat pintasan keyboard.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
