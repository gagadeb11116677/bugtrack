"use client";

import { useEffect, useState } from "react";

const EVENT_KEYS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export function useInactivityTimeout(enabled: boolean, timeoutMs: number, onTimeout: () => void) {
  const [lastActivity, setLastActivity] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const bump = () => setLastActivity(Date.now());
    EVENT_KEYS.forEach((k) => window.addEventListener(k, bump, { passive: true }));
    return () => { EVENT_KEYS.forEach((k) => window.removeEventListener(k, bump)); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => { if (Date.now() - lastActivity >= timeoutMs) onTimeout(); }, 10_000);
    return () => clearInterval(t);
  }, [enabled, lastActivity, timeoutMs, onTimeout]);
}
