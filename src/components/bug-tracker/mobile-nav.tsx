"use client";

import { Bug, ClipboardList, Megaphone, Lightbulb, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  active: "report" | "list" | "announcements" | "features" | "chat";
  onChange: (v: "report" | "list" | "announcements" | "features" | "chat") => void;
}

/** Fixed bottom nav for mobile — quick tab switch. */
export function MobileNav({ active, onChange }: MobileNavProps) {
  const tabs = [
    { value: "report", label: "Lapor", icon: Bug },
    { value: "list", label: "Laporan", icon: ClipboardList },
    { value: "announcements", label: "Info", icon: Megaphone },
    { value: "features", label: "Req", icon: Lightbulb },
    { value: "chat", label: "Chat", icon: MessageCircle },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          aria-pressed={active === t.value}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
            active === t.value ? "text-primary" : "text-muted-foreground",
          )}
        >
          <t.icon className={cn("h-4 w-4", active === t.value && "fill-primary/20")} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}
