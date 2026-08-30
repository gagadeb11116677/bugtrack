import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me — check if logged in + return user info.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user });
}
