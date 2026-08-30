"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly animate a number from previous to next value (rAF-based). */
export function AnimatedCounter({
  value,
  className,
  duration = 600,
  format,
}: {
  value: number;
  className?: string;
  duration?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let rafId = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  const rounded = Math.round(display);
  const text = format ? format(rounded) : String(rounded);
  return <span className={className}>{text}</span>;
}
