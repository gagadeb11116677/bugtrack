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

// DELETE /api/admin/users/[id] — delete user + all related data
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const user = await db.user.findUnique({ where: { id }, select: { name: true, email: true } });
    if (!user) return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });

    // Delete sessions, then user (cascades)
    await db.session.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    await logAudit({ action: "delete", target: `user: ${user.name} (${user.email})`, ip: getClientIp(req) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus user." }, { status: 500 });
  }
}
