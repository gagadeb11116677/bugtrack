import { NextResponse } from "next/server";
import { getClientIp } from "./audit";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfter: 0 };
  }
  if (entry.count >= max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, remaining: max - entry.count, retryAfter: 0 };
}

export function enforceRateLimit(
  req: Request,
  action: string,
  max: number,
  windowMs: number,
): null | NextResponse {
  const ip = getClientIp(req as never);
  const r = rateLimit(`${action}:${ip}`, max, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { error: `Terlalu banyak permintaan. Coba lagi dalam ${r.retryAfter} detik.`, retryAfter: r.retryAfter },
    { status: 429, headers: { "Retry-After": String(r.retryAfter) } },
  );
}

export const LIMITS = {
  report: { max: 8, windowMs: 10 * 60_000 },
  comment: { max: 20, windowMs: 10 * 60_000 },
  upvote: { max: 60, windowMs: 10 * 60_000 },
  upload: { max: 20, windowMs: 10 * 60_000 },
} as const;
