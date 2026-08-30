"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion } from "framer-motion";
import { Lightbulb, ArrowBigUp, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { MarkdownView } from "./markdown-view";
import { UpvoteButton } from "./upvote-button";
import { cn } from "@/lib/utils";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  product: string;
  status: string;
  upvotes: number;
  requesterName: string;
  createdAt: string;
}

const FR_STATUSES = [
  { value: "idea", label: "Idea", className: "text-muted-foreground border-border bg-muted/40" },
  { value: "planned", label: "Planned", className: "text-blue-700 dark:text-blue-400 border-blue-500/30 bg-blue-500/5" },
  { value: "in_progress", label: "In Progress", className: "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5" },
  { value: "done", label: "Done", className: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
  { value: "declined", label: "Declined", className: "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/5" },
];

const schema = z.object({
  title: z.string().trim().min(4, "Min 4 karakter").max(200, "Maks 200"),
  description: z.string().trim().min(10, "Min 10 karakter").max(3000, "Maks 3000"),
  product: z.enum(["jpm", "md"]),
  requesterName: z.string().trim().min(1, "Isi nama").max(80, "Maks 80"),
});

const SORTS = [
  { value: "top", label: "Paling vote" },
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
] as const;

export function FeatureRequests() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("top");

  const { data, isLoading } = useQuery<{ items: FeatureRequest[] }>({
    queryKey: ["feature-requests", statusFilter, sort],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (statusFilter !== "all") sp.set("status", statusFilter);
      sp.set("sort", sort);
      const res = await fetch(`/api/feature-requests?${sp}`);
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
  });

  return (
    <div className="space-y-5">
      {/* Header — saweria style: warm + friendly */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Lightbulb className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Req Fitur</h2>
            <p className="text-xs text-muted-foreground">Mau fitur baru? Usulin aja, kalo banyak vote bakal dibikin. 🚀</p>
          </div>
        </div>
      </div>

      {/* Submit form */}
      <SubmitForm />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-auto min-w-[8rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {FR_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-auto min-w-[8rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-amber-500/40" />
          <p className="mt-3 font-medium">Belum ada ide fitur</p>
          <p className="mt-1 text-sm text-muted-foreground">Jadi yang pertama usulin fitur impian kamu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((fr, i) => (
            <motion.div
              key={fr.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              className="lift rounded-2xl border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <UpvoteButton reportId={fr.id} count={fr.upvotes} size="md" endpoint="feature-requests" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug">{fr.title}</h3>
                    <Badge variant="outline" className={cn("shrink-0", FR_STATUSES.find((s) => s.value === fr.status)?.className)}>
                      {FR_STATUSES.find((s) => s.value === fr.status)?.label ?? fr.status}
                    </Badge>
                  </div>
                  <MarkdownView className="mt-1 text-xs text-foreground/80">{fr.description}</MarkdownView>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {fr.requesterName} · {formatDistanceToNow(new Date(fr.createdAt), { addSuffix: true, locale: localeId })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitForm() {
  const qc = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", product: "jpm", requesterName: "" },
    mode: "onTouched",
  });

  const mutation = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => {
      toast.success("Fitur diusulkan", { description: "Makasih udah kasih ide!" });
      form.reset();
      qc.invalidateQueries({ queryKey: ["feature-requests"] });
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="relative space-y-4 rounded-2xl border bg-card p-5">
        {mutation.isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        <FormField
          control={form.control}
          name="product"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produk</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "jpm", label: "Script JPM" },
                  { value: "md", label: "Script MD" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => field.onChange(p.value)}
                    className={cn("rounded-lg border p-2.5 text-sm transition", field.value === p.value ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40")}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul fitur</FormLabel>
              <FormControl><Input placeholder="cth: dark mode for bot dashboard" maxLength={200} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl><Textarea placeholder="Jelasin fitur yg lu mau, kenapa berguna..." rows={4} maxLength={3000} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requesterName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl><Input placeholder="Nama kamu" maxLength={80} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending} className="glow-primary gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Usulin fitur
        </Button>
      </form>
    </Form>
  );
}
