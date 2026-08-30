"use client";

import { create } from "zustand";

const KEY = "bugtrack:mine";

export interface MineEntry {
  id: string;
  title: string;
  product: string;
  createdAt: string;
}

function load(): MineEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as MineEntry[]) : [];
    return Array.isArray(v) ? v.slice(0, 200) : [];
  } catch {
    return [];
  }
}

function persist(items: MineEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200))); } catch { /* ignore */ }
}

interface MyReportsState {
  items: MineEntry[];
  hydrated: boolean;
  hydrate: () => void;
  add: (e: MineEntry) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}

export const useMyReports = create<MyReportsState>((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: () => { if (get().hydrated) return; set({ items: load(), hydrated: true }); },
  add: (e) => {
    const next = [e, ...get().items.filter((i) => i.id !== e.id)].slice(0, 200);
    persist(next);
    set({ items: next, hydrated: true });
  },
  remove: (id) => { const next = get().items.filter((i) => i.id !== id); persist(next); set({ items: next }); },
  has: (id) => get().items.some((i) => i.id === id),
}));
