"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Users, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserItem {
  id: string; email: string; name: string; avatarUrl: string | null; registerIp: string | null; createdAt: string;
  _count: { sessions: number };
  stats: { reports: number; chatMsgs: number; featureReqs: number; comments: number };
}

export function AdminUsers() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ items: UserItem[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const items = data?.items ?? [];

  return (
    <Card className="lift">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Kelola akun ({items.length})
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-12 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Belum ada user terdaftar.</p>
        ) : (
          <div className="max-h-80 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {items.map((u) => (
              <div key={u.id} className="group flex items-center gap-3 rounded-lg border-2 border-border bg-card p-2.5">
                {/* Avatar */}
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt={u.name} className="h-8 w-8 shrink-0 rounded-lg border-2 border-border object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-primary text-xs font-bold text-primary-foreground">
                    {u.name.slice(0, 1).toUpperCase()}
                  </span>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold uppercase">{u.name}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{u.email}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1 font-mono text-[10px] text-muted-foreground">
                    <span>📝 {u.stats.reports}</span>
                    <span>💬 {u.stats.chatMsgs}</span>
                    <span>💡 {u.stats.featureReqs}</span>
                    <span>· {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: localeId })}</span>
                  </div>
                </div>

                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      title="Hapus akun"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus akun "{u.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Akun + semua data terkait (laporan, chat, komentar) akan dihapus permanen. Aksi ini gak bisa dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(u.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        {deleteMutation.isPending ? "Menghapus..." : "Hapus permanen"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
