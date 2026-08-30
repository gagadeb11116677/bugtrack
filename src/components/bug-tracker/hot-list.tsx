"use client";

import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Flame, ArrowBigUp, Pin, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { MetaBadge } from "./meta-badge";
import { severityDot } from "@/lib/constants";
import { useListFilters } from "@/stores/list-filters-store";

interface HotItem {
  id: string;
  title: string;
  severity: string;
  product: string;
  status: string;
  upvotes: number;
  pinned: boolean;
  createdAt: string;
}

export function HotList({ items, onOpen }: { items: HotItem[]; onOpen: (id: string) => void }) {
  return (
    <Card className="lift">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Prioritas kerja
          </span>
          <button
            type="button"
            onClick={() => useListFilters.getState().setStatus("open")}
            className="font-mono text-[10px] text-muted-foreground transition hover:text-primary"
          >
            lihat semua →
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-6 text-center">
            <Flame className="mx-auto h-6 w-6 text-emerald-500/40" />
            <p className="mt-2 text-xs font-medium">Semua aman 🎉</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Tidak ada laporan open/in-progress.</p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {items.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="group flex w-full items-center gap-2.5 rounded-md border bg-card p-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${i === 0 ? "bg-orange-500/15 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${severityDot(r.severity)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-medium leading-tight">
                      {r.pinned && <Pin className="mr-0.5 inline h-3 w-3 fill-primary text-primary" />}
                      {r.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <MetaBadge kind="product" value={r.product} withDot={false} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: localeId })}
                      </span>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                    <ArrowBigUp className="h-3 w-3 fill-primary" /> {r.upvotes}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
