"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import { MarkdownView } from "./markdown-view";

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export function CommentsSection({ reportId }: { reportId: string }) {
  const qc = useQueryClient();
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");

  const { data, isLoading } = useQuery<{ items: Comment[] }>({
    queryKey: ["comments", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/comments`);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, content }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Komentar terkirim");
      qc.invalidateQueries({ queryKey: ["comments", reportId] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || content.trim().length < 2) return;
    addMutation.mutate();
  };

  const items = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Diskusi {items.length > 0 && `· ${items.length}`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          Belum ada diskusi. Jadi yang pertama nambah info.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <article key={c.id} className="rounded-md border bg-muted/20 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{c.author}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: localeId })}
                </span>
              </div>
              <MarkdownView className="text-[13px]">{c.content}</MarkdownView>
            </article>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-2 rounded-md border bg-card p-3">
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nama kamu" maxLength={80} className="h-8 text-sm" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tambahan info, cara repro, atau klarifikasi... (markdown)" rows={3} maxLength={2000} className="text-sm" />
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">{content.length}/2000</span>
          <Button type="submit" size="sm" disabled={addMutation.isPending || !author.trim() || content.trim().length < 2} className="h-8 gap-1.5 text-xs">
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Kirim
          </Button>
        </div>
      </form>
    </section>
  );
}
