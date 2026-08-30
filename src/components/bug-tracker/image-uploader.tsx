"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal upload");
      return data.url as string;
    },
    onSuccess: (url) => {
      setPreviewError(false);
      onChange(url);
    },
    onError: (e: Error) => toast.error("Upload gagal", { description: e.message }),
  });

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) { toast.error("Format harus PNG, JPEG, WebP, atau GIF."); return; }
    if (file.size > MAX_BYTES) { toast.error("Ukuran maksimal 5MB."); return; }
    upload.mutate(file);
  };

  if (value && !previewError) {
    return (
      <div className="relative overflow-hidden rounded-md border bg-muted/30">
        <img src={value} alt="Pratinjau screenshot" className="max-h-64 w-full object-contain" onError={() => setPreviewError(true)} />
        <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition hover:bg-background" aria-label="Hapus gambar">
          <X className="h-4 w-4" />
        </button>
        {upload.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    );
  }

  if (value && previewError) {
    return (
      <button type="button" onClick={() => { onChange(null); setPreviewError(false); }} className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6 text-center">
        <ImageOff className="h-5 w-5 text-destructive" />
        <span className="text-xs text-destructive">Gambar gagal dimuat. Klik untuk pilih ulang.</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={cn(
        "group flex w-full flex-col items-center gap-2 rounded-md border border-dashed bg-muted/20 px-4 py-7 text-center transition",
        dragging ? "border-primary bg-primary/5 ring-2 ring-ring/30" : "border-border hover:border-primary/50 hover:bg-muted/40",
        upload.isPending && "pointer-events-none opacity-60",
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border transition group-hover:text-primary">
        {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      </span>
      <span className="text-sm font-medium">{upload.isPending ? "Mengunggah..." : "Tarik gambar ke sini, atau klik untuk pilih"}</span>
      <span className="text-xs text-muted-foreground">PNG / JPEG / WebP / GIF · maks 5MB</span>
      <input ref={inputRef} type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
    </button>
  );
}
