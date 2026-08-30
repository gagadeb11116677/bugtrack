import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const updated = await db.bugReport.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  }
}
