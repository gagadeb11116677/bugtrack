import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/feature-requests/[id]/upvote — bump upvotes by 1
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const updated = await db.featureRequest.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  }
}
