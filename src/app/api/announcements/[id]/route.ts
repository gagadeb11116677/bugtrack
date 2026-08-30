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

// PATCH /api/announcements/[id] — admin update (title/content/pinned)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.content === "string") data.content = body.content.slice(0, 5000);
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  try {
    const updated = await db.announcement.update({ where: { id }, data });
    await logAudit({ action: "update", target: `announcement: ${updated.title}`, ip: getClientIp(req) });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui." }, { status: 500 });
  }
}

// DELETE /api/announcements/[id] — admin delete
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const before = await db.announcement.findUnique({ where: { id }, select: { title: true } });
    await db.announcement.delete({ where: { id } });
    await logAudit({ action: "delete", target: `announcement: ${before?.title ?? id}`, ip: getClientIp(req) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }
}
