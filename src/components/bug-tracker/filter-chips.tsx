"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SEVERITIES, CATEGORIES, STATUSES, PRODUCTS, findMeta } from "@/lib/constants";

interface ActiveFilter {
  key: string;
  label: string;
  onClear: () => void;
}

interface FilterChipsProps {
  search: string;
  status: string;
  severity: string;
  category: string;
  product: string;
  sort: string;
  mine: boolean;
  onClear: (key: string) => void;
  onClearAll: () => void;
}

const SORT_LABELS: Record<string, string> = {
  newest: "Terbaru",
  oldest: "Terlama",
  top: "Paling di-upvote",
  views: "Paling dilihat",
};

export function FilterChips({ search, status, severity, category, product, sort, mine, onClear, onClearAll }: FilterChipsProps) {
  const chips: ActiveFilter[] = [];
  if (mine) chips.push({ key: "mine", label: "Laporan saya", onClear: () => onClear("mine") });
  if (search.trim()) chips.push({ key: "search", label: `"${search.trim().slice(0, 24)}"`, onClear: () => onClear("search") });
  if (product !== "all") {
    const m = findMeta(PRODUCTS, product);
    chips.push({ key: "product", label: m?.label ?? product, onClear: () => onClear("product") });
  }
  if (status !== "all") {
    const m = findMeta(STATUSES, status);
    chips.push({ key: "status", label: m?.label ?? status, onClear: () => onClear("status") });
  }
  if (severity !== "all") {
    const m = findMeta(SEVERITIES, severity);
    chips.push({ key: "severity", label: m?.label ?? severity, onClear: () => onClear("severity") });
  }
  if (category !== "all") {
    const m = findMeta(CATEGORIES, category);
    chips.push({ key: "category", label: m?.label ?? category, onClear: () => onClear("category") });
  }
  if (sort !== "newest") chips.push({ key: "sort", label: SORT_LABELS[sort] ?? sort, onClear: () => onClear("sort") });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-muted-foreground">
          {c.label}
          <button type="button" onClick={c.onClear} className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`Hapus filter ${c.label}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
        Reset semua
      </Button>
    </div>
  );
}
