import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/announcements — public list (pinned first, then newest)
export async function GET() {
  const items = await db.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
  });
  return NextResponse.json({ items });
}

// POST /api/announcements — admin create
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (title.length < 3) return NextResponse.json({ error: "Judul minimal 3 karakter." }, { status: 400 });
  if (content.length < 5) return NextResponse.json({ error: "Isi minimal 5 karakter." }, { status: 400 });

  const ann = await db.announcement.create({
    data: { title: title.slice(0, 200), content: content.slice(0, 5000), pinned: Boolean(body.pinned) },
  });
  await logAudit({ action: "update", target: `announcement: ${title}`, ip: getClientIp(req) });
  return NextResponse.json(ann, { status: 201 });
}
