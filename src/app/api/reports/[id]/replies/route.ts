import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(adminCookieName)?.value;
  return verifyAdminToken(token);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const replies = await db.reply.findMany({ where: { reportId: id }, orderBy: { createdAt: "asc" }, take: 100 });
  return NextResponse.json({ items: replies });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const blocked = enforceRateLimit(req, "comment", LIMITS.comment.max, LIMITS.comment.windowMs);
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const content = String(body.content || "").trim();
  if (content.length < 1) return NextResponse.json({ error: "Isi balasan." }, { status: 400 });
  if (content.length > 3000) return NextResponse.json({ error: "Maks 3000 karakter." }, { status: 400 });

  const report = await db.bugReport.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!report) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });

  try {
    const reply = await db.reply.create({ data: { reportId: id, author: "admin", content: content.slice(0, 3000) } });
    await logAudit({ action: "reply", target: report.title, detail: content.slice(0, 100), ip: getClientIp(req) });
    return NextResponse.json(reply, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah balasan." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const replyId = String(body.replyId || "");
  if (!replyId) return NextResponse.json({ error: "replyId wajib." }, { status: 400 });

  try {
    await db.reply.delete({ where: { id: replyId, reportId: id } });
    await logAudit({ action: "delete", target: "reply", detail: replyId, ip: getClientIp(req) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus balasan." }, { status: 500 });
  }
}
