"use client";

import { create } from "zustand";

interface ListFiltersState {
  search: string;
  status: string;
  severity: string;
  category: string;
  product: string;
  sort: string;
  page: number;
  mine: boolean;
  setSearch: (v: string) => void;
  setStatus: (v: string) => void;
  setSeverity: (v: string) => void;
  setCategory: (v: string) => void;
  setProduct: (v: string) => void;
  setSort: (v: string) => void;
  setPage: (v: number) => void;
  setMine: (v: boolean) => void;
  clear: (key: string) => void;
  clearAll: () => void;
}

const DEFAULTS = {
  search: "",
  status: "all",
  severity: "all",
  category: "all",
  product: "all",
  sort: "newest",
  page: 1,
  mine: false,
} as const;

export const useListFilters = create<ListFiltersState>((set) => ({
  ...DEFAULTS,
  setSearch: (v) => set({ search: v, page: 1 }),
  setStatus: (v) => set({ status: v, page: 1 }),
  setSeverity: (v) => set({ severity: v, page: 1 }),
  setCategory: (v) => set({ category: v, page: 1 }),
  setProduct: (v) => set({ product: v, page: 1 }),
  setSort: (v) => set({ sort: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setMine: (v) => set({ mine: v, page: 1 }),
  clear: (key) => {
    if (key === "search") return set({ search: "", page: 1 });
    if (key === "sort") return set({ sort: "newest", page: 1 });
    if (key === "mine") return set({ mine: false, page: 1 });
    set({ [key]: "all", page: 1 } as Partial<ListFiltersState>);
  },
  clearAll: () => set({ ...DEFAULTS }),
}));
