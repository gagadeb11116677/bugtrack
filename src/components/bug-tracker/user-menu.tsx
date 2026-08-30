"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  LogIn, LogOut, User as UserIcon, Loader2, Settings, ClipboardList,
  MessageCircle, ChevronRight, Bug, Lightbulb, MessageSquare, Activity, Camera, Save,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useUserAuth } from "@/stores/user-auth-store";
import { useMyReports } from "@/stores/my-reports-store";
import { useListFilters } from "@/stores/list-filters-store";
import { MetaBadge } from "./meta-badge";
import { AuthDialog } from "./auth-dialog";

interface ProfileData {
  user: { id: string; email: string; name: string };
  stats: { reports: number; chatMessages: number; featureRequests: number; comments: number };
  activity: {
    reports: { id: string; title: string; status: string; severity: string; product: string; createdAt: string; upvotes: number; views: number; pinned: boolean }[];
    chatMessages: { id: string; content: string; createdAt: string }[];
    featureRequests: { id: string; title: string; status: string; upvotes: number; product: string; createdAt: string }[];
    comments: { id: string; content: string; createdAt: string; report: { id: string; title: string } }[];
  };
}

export function UserMenu() {
  const { user, loading, fetchUser, logout } = useUserAuth();
  const myReports = useMyReports();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { myReports.hydrate(); fetchUser(); }, [fetchUser, myReports]);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  if (!user) {
    return (
      <>
        <Button variant="outline" size="sm" className="glow-primary h-8 gap-1.5 text-xs font-bold uppercase" onClick={() => { setMode("login"); setOpen(true); }}>
          <LogIn className="h-3.5 w-3.5" /> Masuk
        </Button>
        <AuthDialog open={open} onOpenChange={setOpen} mode={mode} />
      </>
    );
  }

  const menuItems = [
    { icon: Settings, label: "Profil", onClick: () => { setProfileOpen(true); setMenuOpen(false); } },
    { icon: ClipboardList, label: `Laporan saya (${myReports.items.length})`, onClick: () => { useListFilters.getState().setMine(true); setMenuOpen(false); } },
    { icon: MessageCircle, label: "Chat", onClick: () => { useListFilters.getState(); setMenuOpen(false); window.dispatchEvent(new CustomEvent("goto-chat")); } },
    { icon: LogOut, label: "Keluar", onClick: () => { logout(); setMenuOpen(false); toast.message("Berhasil keluar"); }, danger: true },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen((m) => !m)}
        className="flex items-center gap-1.5 rounded-lg border-2 border-border bg-card px-2 py-1 text-xs font-bold transition hover:bg-accent hover:text-accent-foreground shadow-[2px_2px_0_0_var(--border)]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[80px] truncate sm:block">{user.name}</span>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 top-14 z-50 w-52 rounded-lg border-2 border-border bg-card shadow-[4px_4px_0_0_var(--border)]"
            >
              <div className="border-b-2 border-border px-3 py-2.5">
                <p className="truncate text-sm font-bold uppercase">{user.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{user.email}</p>
              </div>
              {menuItems.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={item.onClick}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold uppercase transition hover:bg-muted ${item.danger ? "text-destructive hover:bg-destructive/10" : ""}`}
                >
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, logout, fetchUser, setUser } = useUserAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editName, setEditName] = useState(() => user?.name ?? "");
  const [editMode, setEditMode] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ProfileData>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (editName !== user?.name) fd.append("name", editName);
      const file = fileRef.current?.files?.[0];
      if (file) fd.append("avatar", file);
      const res = await fetch("/api/user/update", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: (data) => {
      toast.success("Profil diperbarui");
      // Force refresh user dengan avatar baru (cache-bust)
      if (data.user?.avatarUrl) {
        data.user.avatarUrl = `${data.user.avatarUrl}?t=${Date.now()}`;
      }
      setUser(data.user);
      fetchUser();
      setEditMode(false);
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      qc.invalidateQueries({ queryKey: ["chat"] });
      if (fileRef.current) fileRef.current.value = "";
      setAvatarPreview(null);
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  if (!user) return null;

  const stats = data?.stats;
  const activity = data?.activity;
  const avatarUrl = user.avatarUrl;

  const statCards = [
    { label: "Laporan", value: stats?.reports ?? 0, icon: Bug },
    { label: "Chat", value: stats?.chatMessages ?? 0, icon: MessageCircle },
    { label: "Req Fitur", value: stats?.featureRequests ?? 0, icon: Lightbulb },
    { label: "Komentar", value: stats?.comments ?? 0, icon: MessageSquare },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase">
            <UserIcon className="h-4 w-4" /> Profil Saya
          </DialogTitle>
          <DialogDescription>Liat aktivitas & riwayat kamu.</DialogDescription>
        </DialogHeader>

        {/* Profile header — avatar upload + edit name */}
        <div className="rounded-lg border-2 border-border bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            {/* Avatar with upload */}
            <div className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="h-14 w-14 rounded-lg border-2 border-border object-cover" />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="h-14 w-14 rounded-lg border-2 border-border object-cover" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-border bg-primary text-xl font-bold text-primary-foreground">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {editMode && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-border bg-accent text-accent-foreground transition hover:scale-110"
                  title="Upload foto"
                >
                  <Camera className="h-3 w-3" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAvatarPreview(URL.createObjectURL(file));
              }} />
            </div>
            <div className="min-w-0 flex-1">
              {editMode ? (
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={80} className="mb-1" />
              ) : (
                <p className="truncate text-base font-bold uppercase">{user.name}</p>
              )}
              <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
            </div>
            {editMode ? (
              <Button size="sm" className="gap-1.5 text-xs" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Simpan
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditMode(true)}>
                <UserIcon className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
          {editMode && (
            <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">Klik ikon kamera buat ganti foto · maks 5MB</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-lg border-2 border-border p-2.5 text-center">
              <s.icon className="mx-auto h-4 w-4 text-muted-foreground" />
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">{s.value}</p>
              <p className="font-mono text-[9px] uppercase text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="reports">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reports" className="gap-1 text-xs font-bold uppercase"><Bug className="h-3 w-3" /> Laporan</TabsTrigger>
              <TabsTrigger value="chat" className="gap-1 text-xs font-bold uppercase"><MessageCircle className="h-3 w-3" /> Chat</TabsTrigger>
              <TabsTrigger value="features" className="gap-1 text-xs font-bold uppercase"><Lightbulb className="h-3 w-3" /> Fitur</TabsTrigger>
              <TabsTrigger value="comments" className="gap-1 text-xs font-bold uppercase"><MessageSquare className="h-3 w-3" /> Komentar</TabsTrigger>
            </TabsList>

            {/* My reports */}
            <TabsContent value="reports" className="mt-3 space-y-2">
              {activity?.reports.length === 0 ? (
                <EmptyMini text="Belum ada laporan" />
              ) : activity?.reports.map((r) => (
                <div key={r.id} className="rounded-lg border-2 border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-bold">{r.title}</p>
                    {r.pinned && <span className="text-xs">📌</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <MetaBadge kind="product" value={r.product} withDot={false} />
                    <MetaBadge kind="status" value={r.status} withDot={false} />
                    <MetaBadge kind="severity" value={r.severity} withDot={false} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ▲{r.upvotes} · 👁{r.views} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* My chat messages */}
            <TabsContent value="chat" className="mt-3 space-y-2">
              {activity?.chatMessages.length === 0 ? (
                <EmptyMini text="Belum ada pesan chat" />
              ) : activity?.chatMessages.map((m) => (
                <div key={m.id} className="rounded-lg border-2 border-border bg-card p-3">
                  <p className="text-sm">{m.content}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: localeId })}
                  </p>
                </div>
              ))}
            </TabsContent>

            {/* My feature requests */}
            <TabsContent value="features" className="mt-3 space-y-2">
              {activity?.featureRequests.length === 0 ? (
                <EmptyMini text="Belum ada req fitur" />
              ) : activity?.featureRequests.map((f) => (
                <div key={f.id} className="rounded-lg border-2 border-border bg-card p-3">
                  <p className="text-sm font-bold">{f.title}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <MetaBadge kind="product" value={f.product} withDot={false} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ▲{f.upvotes} · {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true, locale: localeId })}
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* My comments */}
            <TabsContent value="comments" className="mt-3 space-y-2">
              {activity?.comments.length === 0 ? (
                <EmptyMini text="Belum ada komentar" />
              ) : activity?.comments.map((c) => (
                <div key={c.id} className="rounded-lg border-2 border-border bg-card p-3">
                  <p className="text-sm">{c.content}</p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    di: {c.report.title} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: localeId })}
                  </p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Logout button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-2 border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => { logout(); onOpenChange(false); toast.message("Berhasil keluar"); }}
        >
          <LogOut className="h-3.5 w-3.5" /> Keluar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Activity className="h-6 w-6 text-muted-foreground/30" />
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
