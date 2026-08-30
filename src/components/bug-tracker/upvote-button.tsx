"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "bugtrack:voted";

function readVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function writeVoted(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function UpvoteButton({
  reportId,
  count,
  size = "sm",
  endpoint = "reports",
}: {
  reportId: string;
  count: number;
  size?: "sm" | "md";
  endpoint?: "reports" | "feature-requests";
}) {
  const qc = useQueryClient();
  const [voted, setVoted] = useState<boolean>(() => readVoted().has(reportId));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${endpoint}/${reportId}/upvote`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal");
      return data.upvotes as number;
    },
    onMutate: () => {
      const next = new Set(readVoted());
      if (next.has(reportId)) return;
      next.add(reportId);
      writeVoted(next);
      setVoted(true);
    },
    onError: () => {
      const next = new Set(readVoted());
      next.delete(reportId);
      writeVoted(next);
      setVoted(false);
      toast.error("Gagal mengirim upvote");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["feature-requests"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
    },
  });

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (voted) { toast.message("Kamu sudah upvote ini"); return; }
    mutation.mutate();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={mutation.isPending}
      aria-pressed={voted}
      aria-label={voted ? "Sudah di-upvote" : "Upvote"}
      className={cn(
        "group inline-flex items-center gap-1 rounded border-2 border-black transition brutalist-press",
        size === "sm" ? "h-7 px-2 text-[11px]" : "h-9 px-2.5 text-xs",
        voted
          ? "bg-yellow-300 text-black shadow-[2px_2px_0_0_#000]"
          : "bg-white text-black hover:bg-yellow-100 shadow-[2px_2px_0_0_#000]",
      )}
    >
      {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowBigUp className={cn("h-3.5 w-3.5", voted && "fill-black")} />}
      <span className="font-bold tabular-nums">{count}</span>
    </button>
  );
}
