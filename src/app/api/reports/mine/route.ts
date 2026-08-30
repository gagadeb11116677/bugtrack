import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const items = await db.bugReport.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true, replies: true } } },
  });
  return NextResponse.json({ items });
}
