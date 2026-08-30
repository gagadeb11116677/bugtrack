import { NextResponse } from "next/server";
import { destroySession } from "@/lib/user-auth";
import { sessionCookieName } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — clear session.
export async function POST() {
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
