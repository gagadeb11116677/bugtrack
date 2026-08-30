import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminToken, verifyPassword, createAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Attempt = { fails: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();
  const state = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 };

  if (now < state.lockedUntil) {
    const retry = Math.ceil((state.lockedUntil - now) / 1000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${retry} detik.`, locked: true, retryAfter: retry },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!verifyPassword(password)) {
    const next: Attempt = { fails: state.fails + 1, lockedUntil: 0 };
    if (next.fails >= MAX_FAILS) {
      next.lockedUntil = now + LOCK_MS;
      next.fails = 0;
    }
    attempts.set(ip, next);
    await logAudit({ action: "login_fail", detail: `attempt #${state.fails + 1}`, ip });
    const remaining = Math.max(0, MAX_FAILS - next.fails);
    return NextResponse.json({ error: "Password salah.", remaining, locked: next.lockedUntil > 0 }, { status: 401 });
  }

  attempts.delete(ip);
  await logAudit({ action: "login_success", ip });

  const token = createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

export async function GET() {
  const token = (await cookies()).get(adminCookieName)?.value;
  const ok = verifyAdminToken(token);
  return NextResponse.json({ ok });
}
