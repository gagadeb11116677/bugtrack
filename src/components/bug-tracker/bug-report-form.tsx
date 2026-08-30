"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send, Eye, Pencil, Bug as BugIcon, ImageIcon, FileText, Check } from "lucide-react";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { MarkdownView } from "./markdown-view";
import { ScreenshotsField } from "./screenshots-field";
import { PRODUCTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMyReports } from "@/stores/my-reports-store";
import { useUserAuth } from "@/stores/user-auth-store";
import { confettiBurst } from "@/lib/confetti";

const schema = z.object({
  title: z.string().trim().min(4, "Kasih judul yang jelas").max(140, "Maks 140 karakter"),
  description: z.string().trim().min(10, "Jelaskan minimal 10 karakter").max(5000, "Maks 5000 karakter"),
  product: z.enum(["jpm", "md"]),
  screenshots: z.array(z.string()).max(4, "Maksimal 4 gambar").default([]),
  reporterName: z.string().trim().min(1, "Isi nama kamu").max(80, "Maks 80 karakter"),
});

type FormValues = z.infer<typeof schema>;
const DEFAULTS: FormValues = { title: "", description: "", product: "jpm", screenshots: [], reporterName: "" };

export function BugReportForm() {
  const [preview, setPreview] = useState(false);
  const qc = useQueryClient();
  const myReports = useMyReports();
  const { user } = useUserAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...DEFAULTS, reporterName: user?.name ?? "" },
    mode: "onTouched",
  });
  const description = form.watch("description");
  const screenshots = form.watch("screenshots") ?? [];

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal mengirim laporan");
      return data as { id: string; title: string; product: string; createdAt: string };
    },
    onSuccess: (created) => {
      myReports.add({ id: created.id, title: created.title, product: created.product, createdAt: created.createdAt });
      confettiBurst();
      toast.success("Laporan terkirim", {
        description: "Makasih udah bantu perbaiki.",
        action: {
          label: "Lihat",
          onClick: () => {
            const url = new URL(window.location.href);
            url.searchParams.set("report", created.id);
            window.history.replaceState({}, "", url.toString());
            window.dispatchEvent(new PopStateEvent("popstate"));
          },
        },
      });
      form.reset(DEFAULTS);
      setPreview(false);
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["home-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-reports"] });
    },
    onError: (e: Error) => toast.error("Gagal mengirim", { description: e.message }),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="relative space-y-5">
        {/* Loading overlay */}
        {mutation.isPending && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="font-mono text-xs font-bold uppercase text-muted-foreground">Mengirim...</span>
            </div>
          </div>
        )}

        {/* Produk selector — card style */}
        <FormField control={form.control} name="product" render={({ field }) => (
          <FormItem>
            <FormLabel className="mb-2 block text-[15px] font-bold uppercase">Produk</FormLabel>
            <div className="grid grid-cols-2 gap-3">
              {PRODUCTS.map((p) => {
                const active = field.value === p.value;
                return (
                  <button key={p.value} type="button" onClick={() => field.onChange(p.value)} aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between rounded-lg border-2 p-3 text-sm transition brutalist-press",
                      active
                        ? "border-primary bg-accent/20 shadow-[3px_3px_0_0_var(--border)]"
                        : "border-border bg-card hover:border-primary/50 hover:bg-accent/5",
                    )}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-full border-2 border-border", p.dotClass)} />
                      <span className={cn("font-bold uppercase", active && "text-primary")}>{p.label}</span>
                    </span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )} />

        {/* Section 1: Bug-nya — card container */}
        <div className="rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_var(--border)]">
          <div className="mb-4 flex items-center gap-2 border-b-2 border-border pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-border bg-accent text-[11px] font-bold text-accent-foreground">1</span>
            <h3 className="text-base font-bold uppercase">Bug-nya</h3>
          </div>
          <div className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1.5 block text-[13px] font-bold uppercase tracking-wide">Judul</FormLabel>
                <FormControl><Input placeholder="Apa masalahnya?" maxLength={140} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="screenshots" render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide">
                  <ImageIcon className="h-4 w-4" /> Screenshot
                  <span className="font-mono text-[10px] font-normal normal-case text-muted-foreground">gambar</span>
                </FormLabel>
                <FormControl><ScreenshotsField value={screenshots} onChange={(urls) => field.onChange(urls)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <div className="mb-1.5 flex items-center justify-between">
                  <FormLabel className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide">
                    <FileText className="h-4 w-4" /> Deskripsi
                    <span className="font-mono text-[10px] font-normal normal-case text-muted-foreground">md</span>
                  </FormLabel>
                  <button type="button" onClick={() => setPreview((p) => !p)}
                    className={cn("flex items-center gap-1 rounded-lg border-2 px-2 py-1 font-mono text-[11px] font-bold transition", preview ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card hover:bg-muted")}>
                    {preview ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
                {preview ? (
                  <div className="min-h-[140px] rounded-lg border-2 border-border bg-background p-3 shadow-[2px_2px_0_0_var(--border)]">
                    {description.trim() ? <MarkdownView>{description}</MarkdownView> : <p className="text-sm text-muted-foreground">Belum ada isi untuk dipratinjau.</p>}
                  </div>
                ) : (
                  <FormControl><Textarea placeholder="Jelasin bug-nya secar detail..." rows={5} maxLength={5000} {...field} /></FormControl>
                )}
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                  <code className="rounded bg-muted px-1">**bold**</code> · <code className="rounded bg-muted px-1">`code`</code> · <code className="rounded bg-muted px-1">- list</code> · <code className="rounded bg-muted px-1">[link](url)</code>
                </p>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Section 2: Pelapor — card container (submit di dalem sini) */}
        <div className="rounded-lg border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_var(--border)]">
          <div className="mb-4 flex items-center gap-2 border-b-2 border-border pb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-border bg-accent text-[11px] font-bold text-accent-foreground">2</span>
            <h3 className="text-base font-bold uppercase">Pelapor</h3>
          </div>
          <FormField control={form.control} name="reporterName" render={({ field }) => (
            <FormItem>
              <FormLabel className="mb-1.5 block text-[13px] font-bold uppercase tracking-wide">Nama</FormLabel>
              <FormControl><Input placeholder="Nama kamu" maxLength={80} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Submit — di dalem card Pelapor */}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-border pt-4">
            <Button type="submit" disabled={mutation.isPending} className="glow-primary gap-2 rounded-lg border-2 border-border bg-foreground px-6 py-2.5 text-sm font-bold uppercase text-background hover:bg-foreground/90">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BugIcon className="h-4 w-4" />}
              {mutation.isPending ? "Mengirim..." : "Kirim laporan"}
              {!mutation.isPending && <Send className="h-3.5 w-3.5" />}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">Laporan langsung publik. 🚀</span>
          </div>
        </div>
      </form>
    </Form>
  );
}
