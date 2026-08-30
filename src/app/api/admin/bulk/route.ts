import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((s: unknown) => typeof s === "string").slice(0, 200) : [];
  if (ids.length === 0) return NextResponse.json({ error: "Tidak ada laporan dipilih." }, { status: 400 });

  const ip = getClientIp(req);

  if (body.delete === true) {
    const before = await db.bugReport.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    const result = await db.bugReport.deleteMany({ where: { id: { in: ids } } });
    await logAudit({ action: "delete", target: `${before.length} laporan`, detail: before.map((r) => r.title).join(" | ").slice(0, 200), ip });
    return NextResponse.json({ ok: true, affected: result.count });
  }

  const data: Record<string, unknown> = { triaged: true };
  const fields = ["status", "severity", "category", "product", "pinned"];
  const changed: string[] = [];
  for (const k of fields) {
    if (k === "pinned" ? typeof body[k] === "boolean" : typeof body[k] === "string" && body[k]) {
      data[k] = body[k];
      changed.push(`${k}=${String(body[k]).slice(0, 40)}`);
    }
  }
  if (changed.length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  const result = await db.bugReport.updateMany({ where: { id: { in: ids } }, data });
  await logAudit({ action: "update", target: `${ids.length} laporan`, detail: changed.join(", "), ip });
  return NextResponse.json({ ok: true, affected: result.count });
}
