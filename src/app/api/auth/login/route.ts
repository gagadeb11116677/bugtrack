import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/user-auth";
import { sessionCookieName, sessionCookieMaxAge } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// POST /api/auth/login — login with email + password.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) return NextResponse.json({ error: "Email dan password wajib." }, { status: 400 });

  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, passwordHash: true, avatarUrl: true } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

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
