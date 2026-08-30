"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGES = 4;

interface ScreenshotsFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export function ScreenshotsField({ value, onChange }: ScreenshotsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal upload");
      return data.url as string;
    },
    onSuccess: (url) => onChange([...value, url]),
    onError: (e: Error) => toast.error("Upload gagal", { description: e.message }),
  });

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (value.length >= MAX_IMAGES) { toast.error(`Maksimal ${MAX_IMAGES} gambar.`); return; }
    if (!ACCEPT.includes(file.type)) { toast.error("Format harus PNG, JPEG, WebP, atau GIF."); return; }
    if (file.size > MAX_BYTES) { toast.error("Ukuran maksimal 5MB."); return; }
    upload.mutate(file);
  };

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const canAdd = value.length < MAX_IMAGES && !upload.isPending;

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((url, idx) => (
            <div key={url + idx} className="group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted/30">
              {broken[url] ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <ImageOff className="h-5 w-5" />
                  <span className="text-[10px]">gagal dimuat</span>
                </div>
              ) : (
                <img src={url} alt={`Screenshot ${idx + 1}`} className="h-full w-full object-cover" onError={() => setBroken((b) => ({ ...b, [url]: true }))} />
              )}
              <button type="button" onClick={() => removeAt(idx)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border transition hover:bg-background" aria-label={`Hapus screenshot ${idx + 1}`}>
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1.5 left-1.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{idx + 1}</span>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); Array.from(e.dataTransfer.files || []).slice(0, MAX_IMAGES - value.length).forEach(handleFile); }}
          className={cn(
            "group flex w-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/20 px-4 py-8 text-sm transition",
            dragging ? "border-primary bg-accent/20 ring-2 ring-ring/30" : "border-border hover:border-primary/50 hover:bg-accent/10",
          )}
        >
          {upload.isPending ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />}
          <span className="text-muted-foreground">{upload.isPending ? "Mengunggah..." : value.length === 0 ? "Tarik gambar ke sini, atau klik untuk pilih" : "Tambah gambar lagi"}</span>
        </button>
      )}

      <p className="font-mono text-[10px] text-muted-foreground">PNG / JPEG / WebP / GIF · maks 5MB · {value.length}/{MAX_IMAGES} gambar</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => { Array.from(e.target.files || []).slice(0, MAX_IMAGES - value.length).forEach(handleFile); e.target.value = ""; }}
      />
    </div>
  );
}
