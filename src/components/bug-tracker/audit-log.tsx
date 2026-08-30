"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ScrollText, LogIn, LogOut, Pencil, Trash2, ShieldX, Clock, Search, MessageCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

const ICONS: Record<string, { icon: React.ElementType; tone: string }> = {
  login_success: { icon: LogIn, tone: "text-emerald-600" },
  login_fail: { icon: ShieldX, tone: "text-red-600" },
  logout: { icon: LogOut, tone: "text-muted-foreground" },
  update: { icon: Pencil, tone: "text-blue-600" },
  delete: { icon: Trash2, tone: "text-red-600" },
  session_expired: { icon: Clock, tone: "text-amber-600" },
  reply: { icon: MessageCircle, tone: "text-primary" },
};

const ACTION_OPTIONS = [
  { value: "all", label: "Semua aksi" },
  { value: "login_success", label: "Login berhasil" },
  { value: "login_fail", label: "Login gagal" },
  { value: "logout", label: "Logout" },
  { value: "update", label: "Ubah laporan" },
  { value: "delete", label: "Hapus laporan" },
  { value: "reply", label: "Balas pelapor" },
];

export function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ items: AuditEntry[] }>({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit?limit=50");
      if (!res.ok) throw new Error("Gagal memuat audit");
      return res.json();
    },
  });

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (actionFilter !== "all") list = list.filter((e) => e.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.target ?? "").toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q) ||
        (e.ip ?? "").toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, actionFilter]);

  return (
    <Card className="lift">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            Log aktivitas admin
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{items.length}</span>
        </div>

        {/* Filters */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari log (target, detail, IP)..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-auto sm:min-w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shimmer h-8 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {search || actionFilter !== "all" ? "Tidak ada log yang cocok." : "Belum ada aktivitas tercatat."}
          </p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto scroll-thin pr-1">
            {items.map((e) => {
              const meta = ICONS[e.action] ?? { icon: ScrollText, tone: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.tone}`} />
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">
                      <span className="font-medium">{label(e.action)}</span>
                      {e.target && <span className="text-muted-foreground"> · {truncate(e.target, 40)}</span>}
                    </p>
                    {e.detail && <p className="font-mono text-[10px] text-muted-foreground">{truncate(e.detail, 60)}</p>}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true, locale: localeId })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function label(action: string): string {
  const map: Record<string, string> = {
    login_success: "Login berhasil",
    login_fail: "Login gagal",
    logout: "Logout",
    update: "Ubah laporan",
    delete: "Hapus laporan",
    session_expired: "Sesi berakhir",
    reply: "Balas pelapor",
  };
  return map[action] ?? action;
}
function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + "…" : s; }
