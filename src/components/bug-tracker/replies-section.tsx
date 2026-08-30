"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BadgeCheck, Loader2, Send, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { MarkdownView } from "./markdown-view";

interface Reply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface RepliesSectionProps {
  reportId: string;
  canReply?: boolean;
}

export function RepliesSection({ reportId, canReply = false }: RepliesSectionProps) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery<{ items: Reply[] }>({
    queryKey: ["replies", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/replies`);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Balasan terkirim");
      qc.invalidateQueries({ queryKey: ["replies", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const res = await fetch(`/api/reports/${reportId}/replies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.message("Balasan dihapus");
      qc.invalidateQueries({ queryKey: ["replies", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 1) return;
    addMutation.mutate();
  };

  const items = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Balasan admin {items.length > 0 && `· ${items.length}`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed bg-primary/5 px-4 py-5 text-center">
          <MessageCircle className="mx-auto h-5 w-5 text-primary/50" />
          <p className="mt-2 text-xs font-medium">Belum ada balasan dari admin</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Admin akan membalas di sini setelah laporan ditinjau.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <article key={r.id} className="group relative rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {r.author === "admin" ? "Admin" : r.author}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: localeId })}
                </span>
              </div>
              <MarkdownView className="text-[13px]">{r.content}</MarkdownView>
              {canReply && (
                <button type="button" onClick={() => deleteMutation.mutate(r.id)} disabled={deleteMutation.isPending} className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive" aria-label="Hapus balasan">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {canReply && (
        <form onSubmit={onSubmit} className="space-y-2 rounded-md border bg-card p-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Balas pelapor... (markdown, akan terlihat publik)"
            rows={3}
            maxLength={3000}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-muted-foreground">{content.length}/3000</span>
            <Button type="submit" size="sm" disabled={addMutation.isPending || content.trim().length < 1} className="h-8 gap-1.5 text-xs">
              {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Kirim balasan
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
