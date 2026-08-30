import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const comments = await db.comment.findMany({ where: { reportId: id }, orderBy: { createdAt: "asc" }, take: 200 });
  return NextResponse.json({ items: comments });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = enforceRateLimit(req, "comment", LIMITS.comment.max, LIMITS.comment.windowMs);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const author = String(body.author || "").trim();
  const content = String(body.content || "").trim();

  if (author.length < 1) return NextResponse.json({ error: "Isi nama kamu." }, { status: 400 });
  if (content.length < 2) return NextResponse.json({ error: "Komentar terlalu pendek." }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Maks 2000 karakter." }, { status: 400 });

  const report = await db.bugReport.findUnique({ where: { id }, select: { id: true } });
  if (!report) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  try {
    const c = await db.comment.create({ data: { reportId: id, author: author.slice(0, 80), content: content.slice(0, 2000) } });
    return NextResponse.json(c, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal." }, { status: 500 });
  }
}
