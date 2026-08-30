// Bug report domain constants — labels, colors, icons

export type Severity = "low" | "medium" | "high" | "critical";
export type Category = "connection" | "command" | "media" | "autoreply" | "auth" | "other";
export type Status = "open" | "in_progress" | "resolved" | "closed";
export type Product = "jpm" | "md";

export interface MetaItem {
  value: string;
  label: string;
  badgeClass: string;
  dotClass: string;
}

// The two products this tracker serves. "sc jpm" = Script JPM, "sc md" = Script MD.
export const PRODUCTS: MetaItem[] = [
  {
    value: "jpm",
    label: "Script JPM",
    badgeClass: "text-orange-700 dark:text-orange-400 border-orange-500/30 bg-orange-500/5",
    dotClass: "bg-orange-500",
  },
  {
    value: "md",
    label: "Script MD",
    badgeClass: "text-violet-700 dark:text-violet-400 border-violet-500/30 bg-violet-500/5",
    dotClass: "bg-violet-500",
  },
];

export const SEVERITIES: MetaItem[] = [
  { value: "low", label: "Low", badgeClass: "text-muted-foreground border-border bg-transparent", dotClass: "bg-stone-400" },
  { value: "medium", label: "Medium", badgeClass: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5", dotClass: "bg-amber-500" },
  { value: "high", label: "High", badgeClass: "text-orange-700 dark:text-orange-400 border-orange-500/30 bg-orange-500/5", dotClass: "bg-orange-500" },
  { value: "critical", label: "Critical", badgeClass: "text-red-700 dark:text-red-400 border-red-500/30 bg-red-500/5", dotClass: "bg-red-500" },
];

export const CATEGORIES: MetaItem[] = [
  { value: "connection", label: "Koneksi", badgeClass: "text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/5", dotClass: "bg-blue-500" },
  { value: "command", label: "Perintah", badgeClass: "text-violet-700 dark:text-violet-400 border-violet-500/30 bg-violet-500/5", dotClass: "bg-violet-500" },
  { value: "media", label: "Media", badgeClass: "text-teal-700 dark:text-teal-400 border-teal-500/30 bg-teal-500/5", dotClass: "bg-teal-500" },
  { value: "autoreply", label: "Auto-reply", badgeClass: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5", dotClass: "bg-amber-500" },
  { value: "auth", label: "Auth/QR", badgeClass: "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/5", dotClass: "bg-rose-500" },
  { value: "other", label: "Lainnya", badgeClass: "text-muted-foreground border-border bg-transparent", dotClass: "bg-stone-400" },
];

export const STATUSES: MetaItem[] = [
  { value: "open", label: "Open", badgeClass: "text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/5", dotClass: "bg-blue-500" },
  { value: "in_progress", label: "In Progress", badgeClass: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5", dotClass: "bg-amber-500" },
  { value: "resolved", label: "Resolved", badgeClass: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5", dotClass: "bg-emerald-500" },
  { value: "closed", label: "Closed", badgeClass: "text-muted-foreground border-border bg-transparent", dotClass: "bg-stone-400" },
];

export function findMeta(list: MetaItem[], value: string): MetaItem | undefined {
  return list.find((m) => m.value === value);
}
export function productMeta(v: string) { return findMeta(PRODUCTS, v); }
export function severityMeta(v: string) { return findMeta(SEVERITIES, v); }
export function categoryMeta(v: string) { return findMeta(CATEGORIES, v); }
export function statusMeta(v: string) { return findMeta(STATUSES, v); }

export function severityDot(v: string) {
  return severityMeta(v)?.dotClass ?? "bg-stone-400";
}

export function parseScreenshots(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : [];
  } catch {
    return [];
  }
}
