"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  User, Calendar, Monitor, Image as ImageIcon, ListChecks, StickyNote, Mail, Link2, Check, Pin, Eye, Clock, Copy,
} from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { MetaBadge, TriageBadge } from "./meta-badge";
import { MarkdownView } from "./markdown-view";
import { AdminActions } from "./admin-actions";
import { UpvoteButton } from "./upvote-button";
import { RepliesSection } from "./replies-section";
import { CommentsSection } from "./comments-section";
import { severityDot, parseScreenshots } from "@/lib/constants";
import { useListFilters } from "@/stores/list-filters-store";

export interface BugReport {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string | null;
  product: string;
  severity: string;
  category: string;
  status: string;
  triaged: boolean;
  pinned: boolean;
  upvotes: number;
  views: number;
  resolvedAt: string | null;
  screenshots: string | null;
  reporterName: string;
  reporterEmail: string | null;
  environment: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  report: BugReport;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  admin?: boolean;
  onChanged?: () => void;
}

function Meta({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export function ReportDetailDialog({ report, open, onOpenChange, admin, onChanged }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/?report=${report.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Tautan disalin", { description: "Bagikan ke siapapun untuk lihat laporan ini." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin tautan");
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setCopiedId(true);
      toast.success("ID disalin", { description: report.id });
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error("Gagal menyalin ID");
    }
  };

  const shots = parseScreenshots(report.screenshots);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[640px] scroll-thin">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${severityDot(report.severity)}`} />
            <button
              type="button"
              onClick={copyId}
              title="Salin ID laporan"
              className="group flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition hover:text-foreground"
            >
              #{report.id.slice(-6).toUpperCase()}
              {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />}
            </button>
            {report.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Pin className="h-3 w-3" /> Disematkan
              </span>
            )}
            <MetaBadge kind="product" value={report.product} />
            {report.triaged ? <MetaBadge kind="status" value={report.status} withDot={false} /> : <TriageBadge />}
            <Button type="button" variant="ghost" size="sm" onClick={copyLink} className="ml-auto h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? "Disalin" : "Salin tautan"}
            </Button>
          </div>
          <DialogTitle className="text-lg leading-snug">{report.title}</DialogTitle>
          <DialogDescription>
            Dilaporkan {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: localeId })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/20 p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Meta icon={User} label="Pelapor">
                <button type="button" onClick={() => { useListFilters.getState().setSearch(report.reporterName); toast.success(`Filter laporan dari ${report.reporterName}`); onOpenChange(false); }} className="font-medium text-primary hover:underline" title="Tampilkan semua laporan dari pelapor ini">
                  {report.reporterName}
                </button>
              </Meta>
              {report.reporterEmail && (
                <Meta icon={Mail} label="Email">
                  <a href={`mailto:${report.reporterEmail}`} className="text-primary hover:underline">{report.reporterEmail}</a>
                </Meta>
              )}
              {report.environment && (
                <Meta icon={Monitor} label="Environment">
                  <span className="font-mono text-xs">{report.environment}</span>
                </Meta>
              )}
              <Meta icon={Calendar} label="Waktu">
                {format(new Date(report.createdAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
              </Meta>
            </div>
            <UpvoteButton reportId={report.id} count={report.upvotes} size="md" />
          </div>

          {/* Views + resolution time strip */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {report.views ?? 0} dilihat
            </span>
            {report.resolvedAt && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Clock className="h-3.5 w-3.5" />
                Selesai {formatDistanceToNow(new Date(report.resolvedAt), { addSuffix: true, locale: localeId })}
                <span className="text-muted-foreground">
                  · {(() => {
                    const hrs = (new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime()) / (1000 * 60 * 60);
                    if (hrs < 1) return `${Math.round(hrs * 60)}m resolve`;
                    if (hrs < 24) return `${Math.round(hrs * 10) / 10}j resolve`;
                    return `${Math.round(hrs / 24)}h resolve`;
                  })()}
                </span>
              </span>
            )}
          </div>

          {report.triaged && (
            <div className="flex flex-wrap items-center gap-2">
              <MetaBadge kind="severity" value={report.severity} />
              <MetaBadge kind="category" value={report.category} />
              <MetaBadge kind="status" value={report.status} />
            </div>
          )}

          <section>
            <SectionHead icon={null} label="Deskripsi" />
            <div className="rounded-md border p-3.5"><MarkdownView>{report.description}</MarkdownView></div>
          </section>

          {report.stepsToReproduce?.trim() && (
            <section>
              <SectionHead icon={ListChecks} label="Langkah Reproduksi" />
              <div className="rounded-md border p-3.5"><MarkdownView>{report.stepsToReproduce}</MarkdownView></div>
            </section>
          )}

          {shots.length > 0 && (
            <section>
              <SectionHead icon={ImageIcon} label={`Screenshot${shots.length > 1 ? "s" : ""}`} />
              <div className="grid gap-2">
                {shots.map((src, i) => (
                  <a key={src + i} href={src} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-md border bg-muted/30">
                    <img src={src} alt={`Screenshot ${i + 1}`} className="max-h-[420px] w-full object-contain" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {admin && report.adminNotes?.trim() && (
            <section>
              <SectionHead icon={StickyNote} label="Catatan Admin" />
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3.5"><MarkdownView>{report.adminNotes}</MarkdownView></div>
            </section>
          )}

          <Separator />

          <RepliesSection reportId={report.id} canReply={admin} />

          <Separator />

          <CommentsSection reportId={report.id} />

          <Separator />

          {admin ? <AdminActions report={report} onChanged={onChanged} /> : (
            <p className="text-center font-mono text-[11px] text-muted-foreground">status & kategori diatur oleh admin setelah ditinjau</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHead({ icon: Icon, label }: { icon: React.ElementType | null; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}
