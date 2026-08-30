import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "30", 10) || 30));
  const items = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return NextResponse.json({ items });
}
