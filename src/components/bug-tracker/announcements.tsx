"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Pin, Plus, Trash2, Loader2, X, Send, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";

import { MarkdownView } from "./markdown-view";

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Pinned announcements as dismissible banners at the top of the page. */
export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data } = useQuery<{ items: Announcement[] }>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 60_000,
  });

  const pinned = (data?.items ?? []).filter((a) => a.pinned && !dismissed.has(a.id));

  if (pinned.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="space-y-2">
        {pinned.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-md border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <button
              type="button"
              onClick={() => setDismissed((d) => new Set(d).add(a.id))}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
              aria-label="Tutup pengumuman"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2 pr-6">
              <Pin className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">{a.title}</p>
                <MarkdownView className="mt-1 text-xs text-foreground/80">{a.content}</MarkdownView>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: localeId })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

/** Section with list + admin create/edit/delete. */
export function AnnouncementSection({ canManage = false }: { canManage?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);

  const { data, isLoading } = useQuery<{ items: Announcement[] }>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
  });

  const resetForm = () => { setTitle(""); setContent(""); setPinned(false); setEditing(null); };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const res = await fetch(`/api/announcements/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, pinned }),
        });
        const d = await res.json(); if (!res.ok) throw new Error(d?.error || "Gagal");
        return d;
      }
      const res = await fetch("/api/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pinned }),
      });
      const d = await res.json(); if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Pengumuman diperbarui" : "Pengumuman diposting");
      setOpen(false); resetForm();
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const d = await res.json(); if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.message("Pengumuman dihapus");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const items = data?.items ?? [];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || content.trim().length < 5) return;
    saveMutation.mutate();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Megaphone className="h-3.5 w-3.5" />
          Pengumuman {items.length > 0 && `· ${items.length}`}
        </span>
        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Post
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit pengumuman" : "Post pengumuman baru"}</DialogTitle>
                <DialogDescription>Post akan tampil sebagai banner (kalo pinned) + di section ini. Mendukung markdown.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" maxLength={200} />
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Isi pengumuman... (markdown)" rows={5} maxLength={5000} />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-border accent-primary" />
                  Sematkan (tampil sebagai banner di atas)
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); resetForm(); }}>Batal</Button>
                  <Button type="submit" size="sm" disabled={saveMutation.isPending} className="gap-1.5">
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {editing ? "Simpan" : "Post"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <Card><CardContent className="h-20 animate-pulse" /></Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <Megaphone className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">Belum ada pengumuman dari admin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={a.pinned ? "border-primary/30 bg-primary/5" : ""}>
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {a.pinned && <Pin className="h-3 w-3 fill-primary text-primary" />}
                          <h4 className="text-sm font-semibold">{a.title}</h4>
                        </div>
                        <MarkdownView className="mt-1 text-xs text-foreground/80">{a.content}</MarkdownView>
                        <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditing(a); setTitle(a.title); setContent(a.content); setPinned(a.pinned); setOpen(true); }}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(a.id)}
                            disabled={deleteMutation.isPending}
                            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Hapus"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
