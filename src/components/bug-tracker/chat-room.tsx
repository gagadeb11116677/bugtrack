"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Send, Loader2, MessageCircle, ShieldCheck, Users, Reply, Smile, ArrowLeft, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { useUserAuth } from "@/stores/user-auth-store";

interface Reaction { id: string; emoji: string; author: string; }
interface ChatMessage {
  id: string; author: string; content: string; images?: string | null; replyTo: string | null;
  isAdmin?: boolean; avatarUrl?: string | null; reactions: Reaction[]; createdAt: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "😮"];

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/login", { method: "GET" })
      .then((r) => r.json())
      .then((d) => active && setIsAdmin(Boolean(d.ok)))
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return isAdmin;
}

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? "Hari ini" : isYesterday(date) ? "Kemarin" : format(date, "dd MMM yyyy", { locale: localeId });
  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-muted/60 px-3 py-1 font-mono text-[10px] font-bold uppercase text-muted-foreground backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}

export function ChatRoom({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reactionPicker, setReactionPicker] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const imgRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = useIsAdmin();
  const { user } = useUserAuth();
  const authorName = isAdmin ? "xobe" : (user?.name || "Anonim");

  const { data, isLoading } = useQuery<{ items: ChatMessage[] }>({
    queryKey: ["chat"],
    queryFn: async () => {
      const res = await fetch("/api/chat");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    refetchInterval: 2_000, // real-time polling 2s (fast WA style)
  });

  const { data: typingData } = useQuery<{ count: number }>({
    queryKey: ["chat-typing"],
    queryFn: async () => {
      const res = await fetch("/api/chat/typing");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    refetchInterval: 2_000,
  });

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTyping = (typing: boolean) => {
    fetch("/api/chat/typing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typing }),
    }).catch(() => {});
  };

  // Image upload for chat
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal upload");
      return d.url as string;
    },
    onSuccess: (url) => setPendingImages((prev) => [...prev, url]),
    onError: (e: Error) => toast.error("Upload gagal", { description: e.message }),
  });

  const onImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - pendingImages.length);
    files.forEach((f) => {
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type)) { toast.error("Format harus PNG/JPEG/WebP/GIF"); return; }
      if (f.size > 5 * 1024 * 1024) { toast.error("Maks 5MB per gambar"); return; }
      uploadImage.mutate(f);
    });
    e.target.value = "";
  };

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: authorName, content, images: pendingImages, replyTo: replyTo?.id || null, isAdmin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    // Optimistic: langsung tampilin pesan sebelum server confirm
    onMutate: async () => {
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        author: authorName,
        content,
        replyTo: replyTo?.id || null,
        isAdmin,
        avatarUrl: user?.avatarUrl || null,
        reactions: [],
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<{ items: ChatMessage[] }>(["chat"], (old) => ({
        items: [...(old?.items ?? []), optimisticMsg],
      }));
    },
    onSuccess: () => {
      setContent(""); setReplyTo(null); setPendingImages([]); sendTyping(false);
      qc.invalidateQueries({ queryKey: ["chat"] });
    },
    onError: (e: Error) => {
      // Rollback: invalidate bakal re-fetch dengan data asli
      qc.invalidateQueries({ queryKey: ["chat"] });
      if (e.message.includes("Terlalu banyak")) toast.error("Pelan bro", { description: "Maks 20 pesan / 5 menit." });
      else toast.error("Gagal", { description: e.message });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await fetch("/api/chat/reaction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji, author: authorName }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Gagal");
      return d;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chat"] }); setReactionPicker(null); },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.items.length, typingData?.count]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); if (content.trim().length < 1 && pendingImages.length === 0) return; send.mutate(); };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    if (!isAdmin) {
      sendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
    }
  };

  const items = (data?.items ?? []).map((m) => ({
    ...m,
    isAdmin: m.author === "xobe" || Boolean((m as { isAdmin?: boolean }).isAdmin),
  }));

  const msgMap = new Map(items.map((m) => [m.id, m]));

  const groupedReactions = (reactions: Reaction[]) => {
    const groups = new Map<string, string[]>();
    for (const r of reactions) {
      if (!groups.has(r.emoji)) groups.set(r.emoji, []);
      groups.get(r.emoji)!.push(r.author);
    }
    return Array.from(groups.entries());
  };

  const recentAuthors = new Set(
    items.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 5 * 60_000).map((m) => m.author)
  ).size;

  // Group by date for separators
  const renderItems: React.ReactNode[] = [];
  let lastDate = "";
  items.forEach((m) => {
    const d = new Date(m.createdAt);
    const dateKey = format(d, "yyyy-MM-dd");
    if (dateKey !== lastDate) {
      renderItems.push(<DateSeparator key={`sep-${dateKey}`} date={d} />);
      lastDate = dateKey;
    }
    renderItems.push(m);
  });

  const placeholder = isAdmin
    ? "Ketik sebagai xobe... (Enter kirim)"
    : user ? `Ketik sebagai ${user.name}... (Enter kirim)` : "Ketik pesan... (Enter kirim)";

  return (
    <div className={`flex flex-col overflow-hidden ${compact ? "h-[500px] rounded-lg border-2 border-border shadow-[4px_4px_0_0_var(--border)]" : "h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)]"}`}>
      {/* Header — WA style (solid bar, soft dark brown) */}
      <div className="flex items-center justify-between rounded-t-lg bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-3">
          <Image src="/brand.jpg" alt="bugtrack" width={40} height={40} className="h-10 w-10 rounded-full border-2 border-background object-cover" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold uppercase">Chat Komunitas</h2>
              <BadgeCheck className="h-4 w-4 fill-accent text-foreground" />
            </div>
            <p className="flex items-center gap-1 font-mono text-[10px] text-background/60">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {recentAuthors > 0 ? `${recentAuthors} online` : "online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              <ShieldCheck className="h-3 w-3" /> Admin
            </span>
          )}
          <span className="font-mono text-[10px] text-background/50">20/5min</span>
        </div>
      </div>

      {/* Messages — full screen, WA bg pattern */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin bg-gradient-to-b from-accent/5 to-background px-2 py-3 sm:px-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 text-5xl">💬</div>
            <p className="text-sm font-bold uppercase">Belum ada obrolan</p>
            <p className="mt-1 text-xs text-muted-foreground">Sapa duluan yuk! 👋</p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl space-y-1 px-1">
            <AnimatePresence initial={false}>
              {items.map((m) => {
                const isAdminMsg = m.isAdmin;
                const isOwn = m.author === authorName;
                const replyMsg = m.replyTo ? msgMap.get(m.replyTo) : null;
                const reactionGroups = groupedReactions(m.reactions);

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex items-start gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    {/* Avatar (only for non-own, non-admin messages) */}
                    {!isOwn && !isAdminMsg && (
                      m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.author} className="mt-0.5 h-7 w-7 shrink-0 rounded-lg border-2 border-border object-cover" />
                      ) : (
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-muted text-[10px] font-bold text-muted-foreground">
                          {m.author.slice(0, 2).toUpperCase()}
                        </span>
                      )
                    )}
                    {isAdminMsg && (
                      <Image src="/brand.jpg" alt="xobe" width={28} height={28} className="mt-0.5 h-7 w-7 shrink-0 rounded-lg border-2 border-primary object-cover" />
                    )}
                    <div className={`max-w-[85%] sm:max-w-[75%]`}>
                      {/* Reply preview (WA quote bar) */}
                      {replyMsg && (
                        <div className={`mb-0.5 flex items-center gap-2 rounded-t-lg border-l-4 px-2.5 py-1 text-xs ${isOwn ? "border-emerald-500 bg-emerald-500/10" : "border-primary bg-primary/5"}`}>
                          <Reply className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <span className="font-bold uppercase text-primary">{replyMsg.author}</span>
                            <p className="truncate text-muted-foreground">{replyMsg.content}</p>
                          </div>
                        </div>
                      )}

                      {/* Bubble — WA style */}
                      <div
                        className={`relative rounded-lg px-3 py-2 text-sm break-words shadow-sm ${
                          isOwn
                            ? "rounded-tr-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100"
                            : isAdminMsg
                              ? "rounded-tl-sm border-l-4 border-primary bg-accent/15 text-foreground"
                              : "rounded-tl-sm bg-card text-foreground border border-border/50"
                        }`}
                      >
                        {/* Author name (only for non-own messages) */}
                        {!isOwn && (
                          <span className={`mb-0.5 block text-xs font-bold uppercase ${isAdminMsg ? "text-primary" : "text-muted-foreground"}`}>
                            {m.author}
                            {isAdminMsg && <BadgeCheck className="ml-1 inline h-3 w-3 fill-blue-500 text-white" />}
                          </span>
                        )}

                        {/* Content with @mention */}
                        {m.content && m.content.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith("@") ? (
                            <span key={i} className="rounded bg-accent px-1 font-bold text-accent-foreground">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}

                        {/* Images (WhatsApp style — grid below text) */}
                        {(() => {
                          const imgs = parseImages(m.images);
                          if (imgs.length === 0) return null;
                          return (
                            <div className={`mt-1 grid gap-1 ${imgs.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                              {imgs.map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noreferrer noopener" className="overflow-hidden rounded-md border border-border/30">
                                  <img src={src} alt={`Image ${i + 1}`} className="max-h-48 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Time — WA style (bottom right) */}
                        <span className="mt-0.5 block text-right font-mono text-[9px] text-muted-foreground">
                          {format(new Date(m.createdAt), "HH:mm")}
                        </span>

                        {/* Action row (hover) */}
                        <div className={`absolute top-0.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100 ${isOwn ? "left-0.5" : "right-0.5"}`}>
                          <button type="button" onClick={() => setReplyTo(m)} className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background transition hover:bg-foreground" title="Balas">
                            <Reply className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => setReactionPicker(reactionPicker === m.id ? null : m.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background transition hover:bg-foreground" title="React">
                            <Smile className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Reactions (below bubble, WA style) */}
                      {reactionGroups.length > 0 && (
                        <div className={`mt-0.5 flex flex-wrap gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                          {reactionGroups.map(([emoji, authors]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => reactMutation.mutate({ messageId: m.id, emoji })}
                              className="flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs shadow-sm transition hover:scale-110 hover:bg-accent"
                              title={authors.join(", ")}
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[10px] font-bold">{authors.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Emoji picker */}
                      {reactionPicker === m.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`mt-1 flex gap-0.5 rounded-lg bg-foreground p-1.5 shadow-lg ${isOwn ? "ml-auto" : ""}`}
                        >
                          {QUICK_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => reactMutation.mutate({ messageId: m.id, emoji: e })}
                              className="flex h-8 w-8 items-center justify-center rounded text-lg transition hover:scale-125 hover:bg-background/20"
                            >
                              {e}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Typing indicator */}
            {typingData && typingData.count > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-lg rounded-tl-sm bg-card border border-border/50 px-2.5 py-2 shadow-sm">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </span>
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{typingData.count} orang ngetik...</span>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-muted/30 px-3 py-2">
          <Reply className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-primary">Balas {replyTo.author}</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.content}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <span className="text-lg font-bold">✕</span>
          </button>
        </div>
      )}

      {/* Pending images preview */}
      {pendingImages.length > 0 && (
        <div className="flex gap-1.5 bg-primary/80 px-3 pb-1.5">
          {pendingImages.map((url, i) => (
            <div key={i} className="relative h-14 w-14 shrink-0">
              <img src={url} alt={`Upload ${i + 1}`} className="h-14 w-14 rounded-md border-2 border-background object-cover" />
              <button type="button" onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs font-bold" aria-label="Hapus gambar">×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input — WA style bar (solid, soft dark brown) */}
      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-b-lg bg-primary px-3 py-3">
        {/* Image upload button */}
        <button
          type="button"
          onClick={() => imgRef.current?.click()}
          disabled={pendingImages.length >= 4}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/20 text-primary-foreground transition hover:bg-background/30 disabled:opacity-30"
          title="Kirim gambar (maks 4, 5MB)"
        >
          {uploadImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="sr-only" onChange={onImageSelect} />

        <input
          value={content}
          onChange={onInputChange}
          placeholder={placeholder}
          maxLength={500}
          className="flex-1 rounded-full bg-background px-4 py-2.5 font-mono text-sm text-foreground outline-none transition focus:ring-2 focus:ring-accent"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } }}
        />
        <button
          type="submit"
          disabled={send.isPending || (content.trim().length < 1 && pendingImages.length === 0)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition hover:scale-110 disabled:opacity-50"
        >
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
