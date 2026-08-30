import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/user-auth";
import { sessionCookieName, sessionCookieMaxAge } from "@/lib/user-auth";
import { getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/auth/register — register with email + password (no OAuth).
// Limit: 1 account per IP (anti-spam).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
  if (name.length < 1) return NextResponse.json({ error: "Isi nama kamu." }, { status: 400 });

  // Check: 1 IP 1 akun
  const ip = getClientIp(req);
  const existingByIp = await db.user.findFirst({ where: { registerIp: ip } });
  if (existingByIp) {
    return NextResponse.json({ error: "Sudah ada akun terdaftar dari perangkat ini. 1 perangkat 1 akun." }, { status: 409 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });

  const user = await db.user.create({
    data: { email, passwordHash: hashPassword(password), name: name.slice(0, 80), registerIp: ip },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  const token = await createSession(user.id);
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  res.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

