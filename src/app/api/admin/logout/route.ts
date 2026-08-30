import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminCookieName, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
