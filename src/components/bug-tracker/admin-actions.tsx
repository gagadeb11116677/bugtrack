"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2, Save, ChevronDown, ChevronRight, Pencil, Pin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import type { BugReport } from "./report-detail-dialog";
import { SEVERITIES, CATEGORIES, STATUSES, PRODUCTS } from "@/lib/constants";

interface Props {
  report: BugReport;
  onChanged?: () => void;
}

export function AdminActions({ report, onChanged }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(report.status);
  const [severity, setSeverity] = useState(report.severity);
  const [category, setCategory] = useState(report.category);
  const [product, setProduct] = useState(report.product);
  const [adminNotes, setAdminNotes] = useState(report.adminNotes ?? "");
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [pinned, setPinned] = useState(report.pinned);
  const [showEdit, setShowEdit] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { status, severity, category, product, adminNotes, pinned };
      if (showEdit) { payload.title = title; payload.description = description; }
      const res = await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal memperbarui");
      return data;
    },
    onSuccess: () => {
      toast.success("Laporan ditinjau & diperbarui");
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onChanged?.();
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus");
      return data;
    },
    onSuccess: () => {
      toast.success("Laporan dihapus");
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onChanged?.();
    },
    onError: (e: Error) => toast.error("Gagal", { description: e.message }),
  });

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tinjau & kelola</span>
        <span className="font-mono text-[11px] text-muted-foreground">#{report.id.slice(-6).toUpperCase()}</span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-[11px]">Produk</Label>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PRODUCTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">Catatan admin (markdown)</Label>
        <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Progress, akar masalah, keputusan..." maxLength={3000} className="text-sm" />
      </div>

      <div className="rounded-md border border-dashed">
        <button type="button" onClick={() => setShowEdit((s) => !s)} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground">
          {showEdit ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Pencil className="h-3.5 w-3.5" />
          Edit isi laporan (judul &amp; deskripsi)
        </button>
        {showEdit && (
          <div className="space-y-2.5 border-t p-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Judul</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Deskripsi (markdown)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} className="text-sm" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-8 gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus laporan ini?</AlertDialogTitle>
                <AlertDialogDescription>Aksi ini gak bisa dibatalkan. Laporan &ldquo;{report.title}&rdquo; dihapus permanen.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-white hover:bg-destructive/90">
                  {deleteMutation.isPending ? "Menghapus..." : "Hapus permanen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={() => setPinned((p) => !p)} className={`h-8 gap-1.5 text-xs ${pinned ? "border-primary/40 bg-primary/10 text-primary" : ""}`}>
            <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-primary" : ""}`} />
            {pinned ? "Disematkan" : "Sematkan"}
          </Button>
        </div>

        <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="h-8 gap-1.5 text-xs">
          {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Simpan
        </Button>
      </div>
    </div>
  );
}
