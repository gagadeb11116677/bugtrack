"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock, LogOut, Inbox, CheckCircle2, Clock, ShieldAlert, Eye, EyeOff, ScrollText, Download, Pin, TrendingUp, Users, RefreshCw, Filter, Flame, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { ReportsList } from "./reports-list";
import { AuditLog } from "./audit-log";
import { AdminCharts } from "./admin-charts";
import { HotList } from "./hot-list";
import { AnimatedCounter } from "./animated-counter";
import { AnnouncementSection } from "./announcements";
import { ChatRoom } from "./chat-room";
import { AdminUsers } from "./admin-users";
import { RevealOnScroll } from "./reveal-on-scroll";
import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { SEVERITIES, STATUSES, CATEGORIES, PRODUCTS } from "@/lib/constants";
import { toCsv, downloadCsv } from "@/lib/csv";
import { useListFilters } from "@/stores/list-filters-store";

interface Stats {
  total: number;
  untriaged: number;
  resolved: number;
  resolutionRate: number;
  totalViews: number;
  avgResolutionHours: number;
  status: Record<string, number>;
  severity: Record<string, number>;
  category: Record<string, number>;
  product: Record<string, number>;
  topReporters: { name: string; count: number }[];
  hotList: {
    id: string; title: string; severity: string; product: string; status: string;
    upvotes: number; pinned: boolean; createdAt: string;
  }[];
}

const SESSION_MS = 15 * 60 * 1000;

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    let active = true;
    fetch("/api/admin/login", { method: "GET" }).then((r) => r.json()).then((d) => active && setAuthed(Boolean(d.ok))).catch(() => active && setAuthed(false));
    return () => { active = false; };
  }, []);

  // Stats query lifted here so the toolbar badge + auto-refresh share it.
  const statsQuery = useQuery<Stats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Gagal memuat stats");
      return res.json();
    },
    enabled: authed === true,
    refetchInterval: authed === true ? 30_000 : false, // auto-refresh every 30s
  });

  // Auto-refresh the reports list + audit log when admin is active
  useEffect(() => {
    if (authed !== true) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    }, 30_000);
    return () => clearInterval(t);
  }, [authed, qc]);

  const logout = useMutation({
    mutationFn: async () => { await fetch("/api/admin/logout", { method: "POST" }); },
    onSuccess: () => {
      setAuthed(false);
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });

  useInactivityTimeout(authed === true, SESSION_MS, () => {
    toast.warning("Sesi admin berakhir", { description: "Auto-logout setelah 15 menit tidak aktif." });
    logout.mutate();
  });

  useEffect(() => {
    if (lockCountdown <= 0) return;
    const t = setTimeout(() => setLockCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockCountdown]);

  const login = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429 && data.retryAfter) { setLockCountdown(Number(data.retryAfter)); throw new Error(data.error || "Terlalu banyak percobaan."); }
      if (!res.ok) throw new Error(data?.error || "Password salah.");
      return data;
    },
    onSuccess: () => {
      setAuthed(true); setPassword(""); setErrMsg(null);
      toast.success("Selamat datang, Admin");
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
    onError: (e: Error) => setErrMsg(e.message),
  });

  if (authed === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    const locked = lockCountdown > 0;
    return (
      <div className="mx-auto max-w-sm py-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-base font-semibold">Area Admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">Khusus pengelola. Password salah 5x → kunci 60 detik. Sesi otomatis berakhir setelah 15 menit tidak aktif.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (locked || !password) return; setErrMsg(null); login.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pw">Password</Label>
              <div className="relative">
                <Input id="admin-pw" type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setErrMsg(null); }} placeholder="••••••••" autoComplete="current-password" disabled={locked} className="pr-10" />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1} aria-label={showPw ? "Sembunyikan password" : "Lihat password"}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {errMsg && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" /> {errMsg}
              </p>
            )}
            <Button type="submit" className="glow-primary w-full gap-2" disabled={login.isPending || locked || !password}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {locked ? `Tunggu ${lockCountdown}s` : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          <ScrollText className="h-3.5 w-3.5" /> Mode admin
          {statsQuery.data?.untriaged ? (
            <span className="ml-1 inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              {statsQuery.data.untriaged} perlu ditinjau
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          <AutoRefreshBadge />
          <ExportCsv variant="filtered" />
          <ExportCsv variant="all" />
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="h-8 gap-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </Button>
        </div>
      </div>

      <AdminDashboard data={statsQuery.data} />
      <AnnouncementSection canManage />
      <AuditLog />
      <AdminUsers />

      {/* Admin chat — bisa ikut chat dari admin panel */}
      <div>
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Chat komunitas</h3>
        <ChatRoom compact />
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Semua laporan</h3>
        <ReportsList admin />
      </div>
    </div>
  );
}

function AdminDashboard({ data }: { data: Stats | undefined }) {
  const openReport = (id: string) => {
    // reuse the page-level deep-link mechanism: open the report via URL param
    const url = new URL(window.location.href);
    url.searchParams.set("report", id);
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="h-[88px]" /></Card>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total", value: <AnimatedCounter value={data.total} />, icon: Inbox, tone: "text-primary", onClick: null as null | (() => void) },
    { label: "Resolve rate", value: <AnimatedCounter value={data.resolutionRate} format={(n) => `${n}%`} />, icon: TrendingUp, tone: "text-emerald-600", onClick: () => useListFilters.getState().setStatus("resolved") },
    { label: "Perlu ditinjau", value: <AnimatedCounter value={data.untriaged} />, icon: Clock, tone: "text-amber-600", onClick: () => useListFilters.getState().setStatus("open") },
    { label: "Resolved", value: <AnimatedCounter value={data.resolved} />, icon: CheckCircle2, tone: "text-emerald-600", onClick: () => useListFilters.getState().setStatus("resolved") },
    { label: "Total views", value: <AnimatedCounter value={data.totalViews} />, icon: Eye, tone: "text-blue-600", onClick: null as null | (() => void) },
    {
      label: "Avg resolve",
      value: data.avgResolutionHours > 0
        ? <span>{data.avgResolutionHours < 24 ? <AnimatedCounter value={data.avgResolutionHours} format={(n) => `${n}j`} /> : <AnimatedCounter value={Math.round(data.avgResolutionHours / 24)} format={(n) => `${n}h`} />}</span>
        : <span className="text-base font-bold text-muted-foreground">&lt;1j</span>,
      icon: Timer, tone: "text-violet-600", onClick: null as null | (() => void),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={c.onClick ?? undefined} disabled={!c.onClick} className="text-left transition enabled:hover:ring-2 enabled:hover:ring-ring/40 enabled:cursor-pointer disabled:cursor-default">
            <Card className={`lift ${c.onClick ? "enabled:hover:border-primary/40" : ""}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold leading-none tabular-nums">{c.value}</p>
                </div>
                <c.icon className={`h-5 w-5 ${c.tone}`} />
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Hot list — admin's work priority */}
      <RevealOnScroll>
        <HotList items={data.hotList} onOpen={openReport} />
      </RevealOnScroll>

      <RevealOnScroll delay={0.05}>
        <AdminCharts stats={data} />
      </RevealOnScroll>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <RevealOnScroll><Breakdown title="Status" data={data.status} meta={STATUSES} filterKey="status" /></RevealOnScroll>
        <RevealOnScroll delay={0.05}><Breakdown title="Severity" data={data.severity} meta={SEVERITIES} filterKey="severity" /></RevealOnScroll>
        <RevealOnScroll delay={0.1}><Breakdown title="Kategori" data={data.category} meta={CATEGORIES} filterKey="category" /></RevealOnScroll>
        <RevealOnScroll delay={0.05}><TopReporters reporters={data.topReporters} /></RevealOnScroll>
        <RevealOnScroll delay={0.1}><Breakdown title="Produk" data={data.product} meta={PRODUCTS} filterKey="product" /></RevealOnScroll>
      </div>
    </div>
  );
}

function Breakdown({ title, data, meta, filterKey }: { title: string; data: Record<string, number>; meta: { value: string; label: string; dotClass: string }[]; filterKey?: "product" | "status" | "severity" | "category" }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const rows = meta.map((m) => ({ ...m, count: data[m.value] ?? 0 }));
  return (
    <Card className="lift">
      <CardContent className="p-4">
        <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className="space-y-2">
          {rows.map((m) => {
            const pct = Math.round((m.count / total) * 100);
            const clickable = !!filterKey;
            return (
              <button key={m.value} type="button" disabled={!clickable || m.count === 0}
                onClick={() => {
                  if (!filterKey) return;
                  const fn = useListFilters.getState()[`set${cap(filterKey)}` as keyof typeof useListFilters.getState] as ((v: string) => void) | undefined;
                  fn?.(m.value);
                }}
                className="w-full space-y-1 text-left transition enabled:hover:opacity-80 enabled:cursor-pointer disabled:cursor-default">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${m.dotClass}`} /> {m.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{m.count}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${m.dotClass} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TopReporters({ reporters }: { reporters: { name: string; count: number }[] }) {
  const max = reporters.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <Card className="lift">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Top pelapor</span>
        </div>
        {reporters.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Belum ada.</p>
        ) : (
          <ol className="space-y-2">
            {reporters.map((r, i) => (
              <li key={r.name + i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
                    <button type="button" onClick={() => useListFilters.getState().setSearch(r.name)} className="font-medium hover:text-primary hover:underline" title="Filter laporan dari pelapor ini">{r.name}</button>
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">{r.count}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/60" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function ExportCsv({ variant }: { variant: "all" | "filtered" }) {
  const mutation = useMutation({
    mutationFn: async () => {
      const all: Record<string, unknown>[] = [];
      let page = 1; let pages = 1;
      // build query from filter store for "filtered" variant
      const f = useListFilters.getState();
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("admin", "1");
      if (variant === "filtered") {
        if (f.search) params.set("search", f.search);
        if (f.status !== "all") params.set("status", f.status);
        if (f.severity !== "all") params.set("severity", f.severity);
        if (f.category !== "all") params.set("category", f.category);
        if (f.product !== "all") params.set("product", f.product);
        params.set("sort", f.sort);
      }
      while (page <= pages) {
        const url = `/api/reports?${params.toString()}&page=${page}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal memuat");
        const d = (await res.json()) as { items: Record<string, unknown>[]; pages: number };
        all.push(...d.items); pages = d.pages; page += 1;
      }
      return all;
    },
    onSuccess: (rows) => {
      const columns = [
        { key: "id", label: "ID" }, { key: "product", label: "Produk" }, { key: "title", label: "Judul" },
        { key: "description", label: "Deskripsi" }, { key: "status", label: "Status" }, { key: "severity", label: "Severity" },
        { key: "category", label: "Kategori" }, { key: "triaged", label: "Ditinjau" }, { key: "pinned", label: "Disematkan" },
        { key: "upvotes", label: "Upvote" }, { key: "reporterName", label: "Pelapor" }, { key: "reporterEmail", label: "Email" },
        { key: "environment", label: "Environment" }, { key: "adminNotes", label: "Catatan Admin" },
        { key: "createdAt", label: "Dibuat" }, { key: "updatedAt", label: "Diperbarui" },
      ];
      const csv = toCsv(rows, columns);
      const date = new Date().toISOString().slice(0, 10);
      const suffix = variant === "filtered" ? "-filtered" : "";
      downloadCsv(`bugtrack${suffix}-${date}.csv`, csv);
      toast.success(`Export ${rows.length} laporan ke CSV${variant === "filtered" ? " (filter aktif)" : ""}`);
    },
    onError: (e: Error) => toast.error("Gagal export", { description: e.message }),
  });

  return (
    <Button variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="h-8 gap-1.5 text-xs" title={variant === "filtered" ? "Export laporan sesuai filter aktif" : "Export SEMUA laporan"}>
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : variant === "filtered" ? <Filter className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
      {variant === "filtered" ? "Export filter" : "Export semua"}
    </Button>
  );
}

function AutoRefreshBadge() {
  return (
    <span className="hidden items-center gap-1 rounded-full border bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline-flex" title="Daftar laporan & stats auto-refresh tiap 30 detik">
      <RefreshCw className="h-3 w-3 animate-spin [animation-duration:3s]" />
      auto 30s
    </span>
  );
}
