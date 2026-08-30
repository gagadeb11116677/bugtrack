"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, ClipboardList, ArrowLeft, Send, Megaphone, Lightbulb, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { BugReportForm } from "@/components/bug-tracker/bug-report-form";
import { ReportsList } from "@/components/bug-tracker/reports-list";
import { AdminPanel } from "@/components/bug-tracker/admin-panel";
import { ThemeToggle } from "@/components/bug-tracker/theme-toggle";
import { RecentReports } from "@/components/bug-tracker/recent-reports";
import { ReportDetailDialog, type BugReport } from "@/components/bug-tracker/report-detail-dialog";
import { AnnouncementBanner, AnnouncementSection } from "@/components/bug-tracker/announcements";
import { FeatureRequests } from "@/components/bug-tracker/feature-requests";
import { ChatRoom } from "@/components/bug-tracker/chat-room";
import { UserMenu } from "@/components/bug-tracker/user-menu";
import { MobileNav } from "@/components/bug-tracker/mobile-nav";
import { KeyboardHelp, OnboardingHint } from "@/components/bug-tracker/user-friendly";
import { useMyReports } from "@/stores/my-reports-store";

interface HomeStats { total: number; open: number; critical: number; untriaged: number }

const TELEGRAMS = [
  { handle: "@xobedevelopment2", url: "https://t.me/xobedevelopment2" },
  { handle: "@xobedev1", url: "https://t.me/xobedev1" },
  { handle: "@xobedev2", url: "https://t.me/xobedev2" },
];

export default function Home() {
  const [adminMode, setAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "list" | "announcements" | "features" | "chat">("report");
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [deepReport, setDeepReport] = useState<BugReport | null>(null);
  const qc = useQueryClient();
  const myReports = useMyReports();

  useEffect(() => {
    const check = () => {
      const p = new URLSearchParams(window.location.search);
      setAdminMode(p.get("admin") === "1");
      const rid = p.get("report");
      if (rid) setOpenReportId(rid);
    };
    check();
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);

  useEffect(() => { myReports.hydrate(); }, [myReports]);

  useQuery<BugReport | null>({
    queryKey: ["deep-report", openReportId],
    queryFn: async () => {
      if (!openReportId) return null;
      const res = await fetch(`/api/reports/${openReportId}`);
      if (!res.ok) {
        toast.error("Laporan tidak ditemukan", { description: "Mungkin sudah dihapus oleh admin." });
        clearReportParam(); setOpenReportId(null);
        return null;
      }
      const data = await res.json();
      setDeepReport(data);
      return data;
    },
    enabled: !!openReportId,
    staleTime: 0,
  });

  const clearReportParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("report");
    window.history.replaceState({}, "", url.toString());
  };

  const openReport = (id: string) => {
    const cached = qc.getQueryData(["recent-reports"]) as { items?: BugReport[] } | undefined;
    const hit = cached?.items?.find((r) => r.id === id);
    if (hit) setDeepReport(hit);
    setOpenReportId(id);
  };

  const closeDeep = (v: boolean) => {
    if (!v) { setOpenReportId(null); setDeepReport(null); clearReportParam(); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header adminMode={adminMode} />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-6 sm:pb-10 sm:pt-8 ${activeTab === "chat" ? "!max-w-full !px-0 !pt-2 sm:!px-2" : ""}`}
      >
        {adminMode ? (
          <AdminPanel />
        ) : (
          <>
            <OnboardingHint />
            <AnnouncementBanner />
            <Intro />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "report" | "list" | "announcements" | "features" | "chat")} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-md border-[3px] border-border bg-card p-1.5 shadow-[4px_4px_0_0_var(--border)] sm:grid-cols-5">
                <TabsTrigger value="report" className="gap-1.5 rounded-md py-2 text-xs font-extrabold uppercase transition data-[state=active]:bg-foreground data-[state=active]:text-background sm:text-sm">
                  <Bug className="h-3.5 w-3.5" /> Lapor
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5 rounded-md py-2 text-xs font-extrabold uppercase transition data-[state=active]:bg-foreground data-[state=active]:text-background sm:text-sm">
                  <ClipboardList className="h-3.5 w-3.5" /> Laporan
                </TabsTrigger>
                <TabsTrigger value="announcements" className="gap-1.5 rounded-md py-2 text-xs font-extrabold uppercase transition data-[state=active]:bg-foreground data-[state=active]:text-background sm:text-sm">
                  <Megaphone className="h-3.5 w-3.5" /> Info
                </TabsTrigger>
                <TabsTrigger value="features" className="gap-1.5 rounded-md py-2 text-xs font-extrabold uppercase transition data-[state=active]:bg-foreground data-[state=active]:text-background sm:text-sm">
                  <Lightbulb className="h-3.5 w-3.5" /> Req
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-1.5 rounded-md py-2 text-xs font-extrabold uppercase transition data-[state=active]:bg-foreground data-[state=active]:text-background sm:text-sm">
                  <MessageCircle className="h-3.5 w-3.5" /> Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="report" className="mt-6">
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <div className="mx-auto max-w-xl space-y-6">
                    <BugReportForm />
                    <RecentReports onOpen={openReport} />
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="list" className="mt-6">
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <ReportsList />
                </motion.div>
              </TabsContent>

              <TabsContent value="announcements" className="mt-6">
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <div className="mx-auto max-w-2xl space-y-6">
                    <AnnouncementSection />
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <FeatureRequests />
                </motion.div>
              </TabsContent>

              {/* Chat — full screen, no container */}
              <TabsContent value="chat" className="mt-2">
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
                  <ChatRoom />
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </motion.main>

      <Footer />

      {/* Mobile bottom nav — only show on public mode */}
      {!adminMode && <MobileNav active={activeTab} onChange={setActiveTab} />}

      {/* Keyboard shortcut help dialog — global */}
      <KeyboardHelp />

      {deepReport && (
        <ReportDetailDialog report={deepReport} open={!!openReportId} onOpenChange={closeDeep} onChanged={() => {}} />
      )}
    </div>
  );
}

function Header({ adminMode }: { adminMode: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <a href="/" className="group flex items-center gap-2">
          <Image src="/brand.jpg" alt="bugtrack logo" width={28} height={28} priority className="h-7 w-7 rounded-none border-2 border-border object-cover" />
          <span className="font-mono text-sm font-bold uppercase tracking-tight lowercase">bugtrack</span>
        </a>
        <div className="flex items-center gap-2">
          {adminMode ? (
            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <a href="/"><ArrowLeft className="h-3.5 w-3.5" /> Publik</a>
            </Button>
          ) : (
            <>
              <LiveStats />
              <UserMenu />
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function LiveStats() {
  const { data } = useQuery<HomeStats>({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("gagal");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!data) return <span className="hidden font-mono text-[11px] text-muted-foreground sm:block">memuat...</span>;

  return (
    <div className="hidden items-center gap-3 font-mono text-[11px] text-muted-foreground sm:flex">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {data.open} open
      </span>
      <span className="text-border">·</span>
      <span>{data.total} total</span>
      {data.critical > 0 && (
        <>
          <span className="text-border">·</span>
          <span className="text-red-600 dark:text-red-400">{data.critical} kritikal</span>
        </>
      )}
    </div>
  );
}

function Intro() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 border-b-2 border-border pb-5"
    >
      <h1 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">
        Laporkan <span className="highlight -rotate-2 inline-block text-2xl sm:text-3xl">BUG</span>.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Ketemu error, crash, atau yang janggal di Script JPM atau Script MD? Catat di sini biar tim cepat nemuin dan ngerjain. Bisa di-upvote & didiskusi.
      </p>
    </motion.section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-border bg-card">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase">
          <span className="h-2 w-2 rounded-full bg-primary" /> bugtrack
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {TELEGRAMS.map((t) => (
            <a key={t.handle} href={t.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-background px-2.5 py-1 font-mono text-[11px] font-bold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground shadow-[1px_1px_0_0_var(--border)]">
              <Send className="h-3 w-3" /> {t.handle}
            </a>
          ))}
        </div>
        <span className="font-mono text-xs font-bold uppercase text-muted-foreground tabular-nums">{new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
