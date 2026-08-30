"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEVERITIES, CATEGORIES, STATUSES, PRODUCTS, findMeta, type MetaItem } from "@/lib/constants";

interface MetaBadgeProps {
  kind: "product" | "severity" | "category" | "status";
  value: string;
  className?: string;
  withDot?: boolean;
}

function getList(kind: MetaBadgeProps["kind"]): MetaItem[] {
  if (kind === "product") return PRODUCTS;
  if (kind === "severity") return SEVERITIES;
  if (kind === "category") return CATEGORIES;
  return STATUSES;
}

export function MetaBadge({ kind, value, className, withDot = true }: MetaBadgeProps) {
  const list = getList(kind);
  const meta = findMeta(list, value) ?? { value, label: value, badgeClass: "text-muted-foreground border-border bg-transparent", dotClass: "bg-stone-400" };
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.badgeClass, className)}>
      {withDot && <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />}
      {meta.label}
    </Badge>
  );
}

export function TriageBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 border-dashed border-amber-500/40 bg-amber-500/5 font-medium text-amber-700 dark:text-amber-400", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Belum ditinjau
    </Badge>
  );
}
