"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, Clock, Bug } from "lucide-react";

import { MetaBadge } from "./meta-badge";
import { severityDot } from "@/lib/constants";

interface Report {
  id: string;
  title: string;
  severity: string;
  product: string;
  triaged: boolean;
  reporterName: string;
  createdAt: string;
}

export function RecentReports({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery<{ items: Report[] }>({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports?limit=3&sort=newest");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <section className="border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)] rounded-lg lift">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Clock className="h-3 w-3" />
          Laporan terbaru
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 animate-bounce text-4xl">🐛</div>
          <p className="text-sm font-bold uppercase">Wuh, masih sepi!</p>
          <p className="mt-1 text-xs text-muted-foreground">Jadi yang pertama melapor ya! 🚀</p>
        </div>
      ) : (
        <ul className="divide-y">
          {items.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r.id)} className="group flex w-full items-center gap-2.5 py-2 text-left transition hover:opacity-80">
                <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(r.severity)}`} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium leading-tight">{r.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {r.reporterName} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: localeId })}
                  </p>
                </div>
                <MetaBadge kind="product" value={r.product} withDot={false} />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
