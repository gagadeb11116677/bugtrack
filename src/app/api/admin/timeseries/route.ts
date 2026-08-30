import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const days = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const reports = await db.bugReport.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, product: true } });

  const buckets: { date: string; label: string; total: number; jpm: number; md: number }[] = [];
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = fmt(cursor);
    const label = `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ date: key, label, total: 0, jpm: 0, md: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  const idx = new Map(buckets.map((b, i) => [b.date, i]));

  for (const r of reports) {
    const key = fmt(r.createdAt);
    const b = buckets[idx.get(key) ?? -1];
    if (!b) continue;
    b.total += 1;
    if (r.product === "md") b.md += 1;
    else b.jpm += 1;
  }

  return NextResponse.json({ days, buckets });
}
