"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Search, SlidersHorizontal, Inbox, ArrowDownWideNarrow, MessageSquare, UserCircle2, CheckSquare, Trash2, X, Pin, BadgeCheck, Zap, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { MetaBadge, TriageBadge } from "./meta-badge";
import { ReportDetailDialog, type BugReport } from "./report-detail-dialog";
import { UpvoteButton } from "./upvote-button";
import { FilterChips } from "./filter-chips";
import { SEVERITIES, CATEGORIES, STATUSES, PRODUCTS, severityDot, parseScreenshots } from "@/lib/constants";
import { highlightMatch } from "@/lib/format";
import { useMyReports } from "@/stores/my-reports-store";
import { useListFilters } from "@/stores/list-filters-store";

interface ListResponse {
  items: (BugReport & { _count?: { comments: number; replies: number } })[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); } catch { return iso; }
}

const SORTS = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "top", label: "Paling di-upvote" },
  { value: "views", label: "Paling dilihat" },
] as const;

export function ReportsList({ admin = false }: { admin?: boolean }) {
  const f = useListFilters();
  const searchRef = useRef<HTMLInputElement>(null);
  const myReports = useMyReports();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => { myReports.hydrate(); }, [myReports]);

  const [debounced, setDebounced] = useState(f.search);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(f.search), 350);
    return () => clearTimeout(t);
  }, [f.search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !isTypingTarget(e.target)) { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
      // j/k navigate rows when not typing and list has items
      if (admin && !isTypingTarget(e.target)) {
        const rows = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-row-id]'));
        if (rows.length === 0) return;
        if (e.key === "j" || e.key === "k") {
          e.preventDefault();
          const current = rows.findIndex((r) => r.dataset.active === "true");
          let next = e.key === "j" ? (current + 1) : (current - 1);
          if (next < 0) next = rows.length - 1;
          if (next >= rows.length) next = 0;
          rows.forEach((r) => (r.dataset.active = "false"));
          const target = rows[next];
          target.dataset.active = "true";
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
          target.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [admin]);

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const clearSelected = () => setSelected(new Set());

  const bulkMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.delete ? `${(vars.ids as string[]).length} laporan dihapus` : `${(vars.ids as string[]).length} laporan diperbarui`);
      clearSelected();
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const mineIds = myReports.items.map((i) => i.id).join(",");
  const params = new URLSearchParams();
  params.set("limit", "15");
  params.set("page", String(f.page));
  params.set("sort", f.sort);
  if (debounced) params.set("search", debounced);
  if (f.status !== "all") params.set("status", f.status);
  if (f.severity !== "all") params.set("severity", f.severity);
  if (f.category !== "all") params.set("category", f.category);
  if (f.product !== "all") params.set("product", f.product);
  if (admin) params.set("admin", "1");

  const usingMine = f.mine && mineIds.length > 0;
  const url = usingMine ? `/api/reports/mine?ids=${encodeURIComponent(mineIds)}` : `/api/reports?${params.toString()}`;

  const { data, isLoading, isError, refetch } = useQuery<ListResponse>({
    queryKey: ["reports", debounced, f.status, f.severity, f.category, f.product, f.sort, f.page, admin, usingMine ? mineIds : "all"],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    enabled: !(f.mine && mineIds.length === 0),
  });

  let items = data?.items ?? [];
  let total = data?.total ?? 0;
  if (usingMine) {
    items = items.filter((r) => {
      if (f.product !== "all" && r.product !== f.product) return false;
      if (f.status !== "all" && r.status !== f.status) return false;
      if (f.severity !== "all" && r.severity !== f.severity) return false;
      if (f.category !== "all" && r.category !== f.category) return false;
      if (debounced) {
        const q = debounced.toLowerCase();
        const hay = `${r.title} ${r.description} ${r.reporterName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    total = items.length;
  }
  const pages = usingMine ? (total > 0 ? 1 : 0) : data?.pages ?? 1;

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-30 -mx-4 space-y-2.5 bg-background/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex w-full overflow-x-auto rounded-md border bg-card p-1 scroll-thin">
          <ProductPill label="Semua" active={f.product === "all"} onClick={() => f.setProduct("all")} />
          {PRODUCTS.map((p) => (
            <ProductPill key={p.value} label={p.label} dotClass={p.dotClass} active={f.product === p.value} onClick={() => f.setProduct(p.value)} />
          ))}
          {myReports.items.length > 0 && (
            <ProductPill label={`Saya (${myReports.items.length})`} icon={UserCircle2} active={f.mine} onClick={() => f.setMine(!f.mine)} />
          )}
        </div>

        {/* Quick severity chips — one-click filter */}
        <div className="flex items-center gap-1 overflow-x-auto scroll-thin pb-0.5">
          <button
            type="button"
            onClick={() => f.setSeverity("all")}
            aria-pressed={f.severity === "all"}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${f.severity === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Semua
          </button>
          {SEVERITIES.map((s) => {
            const active = f.severity === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => f.setSeverity(active ? "all" : s.value)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${active ? s.badgeClass + " ring-1 ring-offset-0" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${s.dotClass}`} />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input ref={searchRef} value={f.search} onChange={(e) => f.setSearch(e.target.value)} placeholder="Cari judul, deskripsi, atau pelapor... (tekan /)" className="h-10 pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={f.status} onValueChange={f.setStatus}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.severity} onValueChange={f.setSeverity}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua severity</SelectItem>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.category} onValueChange={f.setCategory}>
              <SelectTrigger className="h-9 w-auto min-w-[7rem]"><SelectValue placeholder="Kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.sort} onValueChange={f.setSort}>
              <SelectTrigger className="h-9 w-auto min-w-[8.5rem]">
                <ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <FilterChips search={f.search} status={f.status} severity={f.severity} category={f.category} product={f.product} sort={f.sort} mine={f.mine} onClear={f.clear} onClearAll={f.clearAll} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isLoading ? "Memuat..." : `${total} laporan`}
        </span>
        {pages > 1 && <span className="tabular-nums">{f.page} / {pages}</span>}
      </div>

      {f.mine && mineIds.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <UserCircle2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 font-medium">Belum ada laporan dari kamu</p>
          <p className="mt-1 text-sm text-muted-foreground">Laporan yang kamu kirim tersimpan di sini (di perangkat ini).</p>
        </div>
      ) : isError ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">Gagal memuat data.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Coba lagi</Button>
        </div>
      ) : isLoading ? (
        <div className="divide-y rounded-md border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-16 w-full first:rounded-t-md last:rounded-b-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-md border border-dashed p-12 text-center"
        >
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 font-medium">Belum ada laporan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba ubah filter, atau jadi yang pertama melapor.
          </p>
          {f.search || f.status !== "all" || f.product !== "all" ? (
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => f.clearAll()}>
              Reset filter
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          {items.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
            >
              <ReportRow
                report={r}
                admin={admin}
                divider={i !== 0}
                commentCount={r._count?.comments ?? 0}
                replyCount={r._count?.replies ?? 0}
                selected={selected.has(r.id)}
                onSelectToggle={admin ? toggleSelected : undefined}
                highlightQuery={debounced}
              />
            </motion.div>
          ))}
        </div>
      )}

      {admin && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          pending={bulkMutation.isPending}
          onClear={clearSelected}
          onSetStatus={(status) => bulkMutation.mutate({ ids: [...selected], status })}
          onPin={(pinned) => bulkMutation.mutate({ ids: [...selected], pinned })}
          onResolve={() => bulkMutation.mutate({ ids: [...selected], status: "resolved" })}
          onDelete={() => bulkMutation.mutate({ ids: [...selected], delete: true })}
        />
      )}

      {!usingMine && pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-8" disabled={f.page <= 1} onClick={() => f.setPage(Math.max(1, f.page - 1))}>Sebelumnya</Button>
          <span className="text-xs text-muted-foreground tabular-nums">{f.page} / {pages}</span>
          <Button variant="outline" size="sm" className="h-8" disabled={f.page >= pages} onClick={() => f.setPage(Math.min(pages, f.page + 1))}>Berikutnya</Button>
        </div>
      )}
    </div>
  );
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || t.isContentEditable;
}

function ReportRow({
  report, admin, divider, commentCount, replyCount, selected, onSelectToggle, highlightQuery,
}: {
  report: BugReport; admin: boolean; divider: boolean; commentCount: number; replyCount: number; selected: boolean; onSelectToggle?: (id: string) => void; highlightQuery?: string;
}) {
  const [open, setOpen] = useState(false);
  const snippet = report.description.replace(/[#*`>\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  const hasImg = parseScreenshots(report.screenshots).length > 0;
  const qc = useQueryClient();
  const [quickOpen, setQuickOpen] = useState(false);

  const quickStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.success("Status diperbarui");
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
      setQuickOpen(false);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <>
      <div className={`group flex items-start gap-3 bg-card px-4 py-3.5 transition hover:bg-muted/40 ${divider ? "border-t" : ""} ${selected ? "bg-primary/5" : ""}`}>
        {onSelectToggle && (
          <label className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input type="checkbox" checked={selected}
              onChange={(e) => { e.stopPropagation(); onSelectToggle(report.id); }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-border accent-primary"
              aria-label={`Pilih ${report.title}`} />
          </label>
        )}
        <button type="button" onClick={() => setOpen(true)} data-row-id={report.id} className="min-w-0 flex-1 text-left focus:outline-none focus-visible:bg-muted/40 data-[active=true]:bg-primary/5 data-[active=true]:ring-1 data-[active=true]:ring-primary/30">
          <div className="flex items-start justify-between gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full">
              <span className={`block h-2 w-2 rounded-full ${severityDot(report.severity)}`} aria-hidden />
            </span>
            <h3 className="line-clamp-1 flex-1 text-sm font-semibold leading-snug">
              {highlightQuery ? highlightMatch(report.title, highlightQuery) : report.title}
            </h3>
            <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:block">{timeAgo(report.createdAt)}</span>
          </div>
          {snippet && <p className="ml-5 mt-0.5 line-clamp-1 text-xs text-muted-foreground">{snippet}</p>}
          <div className="ml-5 mt-2 flex flex-wrap items-center gap-1.5">
            {report.pinned && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Pin className="h-2.5 w-2.5" /> Pin
              </span>
            )}
            {/* Aging / SLA badge */}
            {admin && report.status !== "closed" && report.status !== "resolved" && (() => {
              const ageHours = (Date.now() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60);
              if (report.severity === "critical" && ageHours > 24) {
                return <span className="inline-flex items-center gap-0.5 rounded-full border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 animate-pulse" title="Critical open >24 jam">🚨 SLA</span>;
              }
              if (ageHours > 168) {
                return <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-600" title="Open >7 hari">⏰ Aging</span>;
              }
              return null;
            })()}
            <MetaBadge kind="product" value={report.product} />
            {report.triaged ? (
              <>
                <MetaBadge kind="status" value={report.status} />
                <MetaBadge kind="severity" value={report.severity} />
                <MetaBadge kind="category" value={report.category} />
              </>
            ) : <TriageBadge />}
            {hasImg && <span className="font-mono text-[11px] text-muted-foreground">· img</span>}
            {replyCount > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-[11px] text-primary">
                · <BadgeCheck className="h-3 w-3" /> {replyCount}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-[11px] text-muted-foreground">
                · <MessageSquare className="h-3 w-3" /> {commentCount}
              </span>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">· {report.reporterName}</span>
            <span className="font-mono text-[11px] text-muted-foreground sm:hidden">· {timeAgo(report.createdAt)}</span>
          </div>
        </button>

        {/* Admin inline quick triage */}
        {admin && (
          <Popover open={quickOpen} onOpenChange={setQuickOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 hidden h-6 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 font-mono text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary sm:flex"
                title="Ubah status cepat"
              >
                <Zap className="h-3 w-3" /> Status
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="end" onClick={(e) => e.stopPropagation()}>
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Ubah status cepat</p>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => quickStatus.mutate(s.value)}
                  disabled={quickStatus.isPending || report.status === s.value}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition hover:bg-muted ${report.status === s.value ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dotClass}`} />
                  {s.label}
                  {report.status === s.value && <Check className="ml-auto h-3 w-3" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        <UpvoteButton reportId={report.id} count={report.upvotes} />
      </div>
      <ReportDetailDialog report={report} open={open} onOpenChange={setOpen} admin={admin} onChanged={() => {}} />
    </>
  );
}

function ProductPill({ label, dotClass, icon: Icon, active, onClick }: { label: string; dotClass?: string; icon?: React.ElementType; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : dotClass ? <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} /> : null}
      {label}
    </button>
  );
}

function BulkBar({ count, pending, onClear, onSetStatus, onPin, onResolve, onDelete }: {
  count: number; pending: boolean; onClear: () => void; onSetStatus: (status: string) => void; onPin: (pinned: boolean) => void; onResolve: () => void; onDelete: () => void;
}) {
  return (
    <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-2 rounded-lg border-2 border-border bg-card px-3 py-2 shadow-[4px_4px_0_0_var(--border)]">
      <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase">
        <CheckSquare className="h-3.5 w-3.5 text-primary" /> {count} dipilih
      </span>
      <div className="h-4 w-px bg-border" />
      <button type="button" onClick={onResolve} disabled={pending} className="flex items-center gap-1 rounded-lg border-2 border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20" title="Tandai semua sebagai Resolved">
        <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
      </button>
      <Select onValueChange={(v) => onSetStatus(v)}>
        <SelectTrigger className="h-8 w-auto min-w-[7rem] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
      </Select>
      <button type="button" onClick={() => onPin(true)} disabled={pending} className="flex items-center gap-1 rounded-lg border-2 border-border bg-primary/5 px-2 py-1 text-xs font-bold text-primary transition hover:bg-primary/10" title="Sematkan">
        <Pin className="h-3.5 w-3.5" /> Pin
      </button>
      <button type="button" onClick={() => onPin(false)} disabled={pending} className="rounded-lg border-2 border-border px-2 py-1 text-xs font-bold text-muted-foreground transition hover:bg-muted" title="Lepas pin">
        Lepas
      </button>
      <button type="button" onClick={onDelete} disabled={pending} className="flex items-center gap-1 rounded-lg border-2 border-destructive bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive transition hover:bg-destructive/20">
        <Trash2 className="h-3.5 w-3.5" /> Hapus
      </button>
      <button type="button" onClick={onClear} disabled={pending} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground transition hover:bg-muted">
        <X className="h-3.5 w-3.5" /> Batal
      </button>
    </div>
  );
}
