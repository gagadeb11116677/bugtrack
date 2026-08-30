import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(adminCookieName)?.value;
  return verifyAdminToken(token);
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // Increment views (best-effort, don't fail the read)
  try { await db.bugReport.update({ where: { id }, data: { views: { increment: 1 } } }); } catch { /* ignore */ }
  const report = await db.bugReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
  return NextResponse.json(report);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = { triaged: true };
  const allowed = ["status", "severity", "category", "product", "adminNotes", "title", "description", "pinned"];
  const changes: string[] = [];
  for (const k of allowed) {
    if (k in body) {
      data[k] = body[k];
      changes.push(`${k}=${String(body[k]).slice(0, 40)}`);
    }
  }

  // Track resolution time: if status becomes resolved/closed and not yet resolvedAt, set now.
  // If status reverts to open/in_progress, clear resolvedAt.
  if (typeof body.status === "string") {
    if ((body.status === "resolved" || body.status === "closed") && !data.resolvedAt) {
      data.resolvedAt = new Date();
    } else if (body.status === "open" || body.status === "in_progress") {
      data.resolvedAt = null;
    }
  }

  try {
    const before = await db.bugReport.findUnique({ where: { id }, select: { title: true } });
    const updated = await db.bugReport.update({ where: { id }, data });
    await logAudit({ action: "update", target: before?.title ?? id, detail: changes.join(", ") || "no changes", ip: getClientIp(req) });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const before = await db.bugReport.findUnique({ where: { id }, select: { title: true } });
    await db.bugReport.delete({ where: { id } });
    await logAudit({ action: "delete", target: before?.title ?? id, ip: getClientIp(req) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }
}
