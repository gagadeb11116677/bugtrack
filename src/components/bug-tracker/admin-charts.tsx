"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITIES, STATUSES, PRODUCTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  status: Record<string, number>;
  severity: Record<string, number>;
  category: Record<string, number>;
  product: Record<string, number>;
}

const COLORS: Record<string, string> = {
  jpm: "#f97316", md: "#8b5cf6",
  open: "#3b82f6", in_progress: "#f59e0b", resolved: "#10b981", closed: "#94a3b8",
  low: "#94a3b8", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
  connection: "#3b82f6", command: "#8b5cf6", media: "#14b8a6", autoreply: "#f59e0b", auth: "#f43f5e", other: "#94a3b8",
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

const RANGES = [
  { value: 7, label: "7 hari" },
  { value: 30, label: "30 hari" },
  { value: 90, label: "90 hari" },
] as const;

export function AdminCharts({ stats }: { stats?: Stats }) {
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery<{ buckets: { label: string; total: number; jpm: number; md: number }[] }>({
    queryKey: ["admin-timeseries", days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/timeseries?days=${days}`);
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
  });

  const buckets = data?.buckets ?? [];
  const statusData = stats ? STATUSES.map((s) => ({ name: s.label, value: stats.status[s.value] ?? 0, key: s.value })).filter((d) => d.value > 0) : [];
  const severityData = stats ? SEVERITIES.map((s) => ({ name: s.label, value: stats.severity[s.value] ?? 0, key: s.value })) : [];
  const productData = stats ? PRODUCTS.map((p) => ({ name: p.label, value: stats.product[p.value] ?? 0, key: p.value })) : [];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Laporan {days} hari terakhir
            </p>
            <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDays(r.value)}
                  className={cn(
                    "rounded px-2 py-1 font-mono text-[10px] font-medium transition",
                    days === r.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={days === r.value}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-md" />
          ) : buckets.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">Belum ada data.</div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buckets} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gJpm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.jpm} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={COLORS.jpm} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gMd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.md} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={COLORS.md} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={days > 30 ? 32 : 16} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="jpm" name="Script JPM" stackId="1" stroke={COLORS.jpm} strokeWidth={1.5} fill="url(#gJpm)" />
                  <Area type="monotone" dataKey="md" name="Script MD" stackId="1" stroke={COLORS.md} strokeWidth={1.5} fill="url(#gMd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Per status</p>
          {!stats ? <Skeleton className="h-44 w-full rounded-md" /> : statusData.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-xs text-muted-foreground">Belum ada data.</div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                    {statusData.map((d) => <Cell key={d.key} fill={COLORS[d.key] ?? "#94a3b8"} stroke="var(--background)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {stats && statusData.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {statusData.map((d) => (
                <span key={d.key} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[d.key] }} />
                  {d.name} <span className="font-mono tabular-nums">{d.value}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Per severity</p>
          {!stats ? <Skeleton className="h-44 w-full rounded-md" /> : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((d) => <Cell key={d.key} fill={COLORS[d.key] ?? "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Per produk</p>
          {!stats ? <Skeleton className="h-36 w-full rounded-md" /> : (
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {productData.map((d) => <Cell key={d.key} fill={COLORS[d.key] ?? "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
