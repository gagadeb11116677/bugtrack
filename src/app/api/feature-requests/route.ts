import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";
import { getClientIp, logAudit } from "@/lib/audit";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/feature-requests?status=&product=&sort=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const product = sp.get("product") || undefined;
  const sort = sp.get("sort") || "top";

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (product && product !== "all") where.product = product;

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "oldest"
        ? { createdAt: "asc" as const }
        : { upvotes: "desc" as const };

  const items = await db.featureRequest.findMany({ where, orderBy, take: 100 });
  return NextResponse.json({ items });
}

// POST /api/feature-requests — public submit
export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "comment", LIMITS.comment.max, LIMITS.comment.windowMs);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const requesterName = String(body.requesterName || "").trim();
  if (title.length < 4) return NextResponse.json({ error: "Judul minimal 4 karakter." }, { status: 400 });
  if (description.length < 10) return NextResponse.json({ error: "Deskripsi minimal 10 karakter." }, { status: 400 });
  if (requesterName.length < 1) return NextResponse.json({ error: "Isi nama kamu." }, { status: 400 });

  const fr = await db.featureRequest.create({
    data: {
      title: title.slice(0, 200),
      description: description.slice(0, 3000),
      product: body.product === "md" ? "md" : "jpm",
      requesterName: requesterName.slice(0, 80),
    },
  });
  return NextResponse.json(fr, { status: 201 });
}

// PATCH /api/feature-requests — admin update status
export async function PATCH(req: NextRequest) {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id wajib." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") data.status = body.status;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  try {
    const before = await db.featureRequest.findUnique({ where: { id }, select: { title: true } });
    const updated = await db.featureRequest.update({ where: { id }, data });
    await logAudit({ action: "update", target: `feature: ${before?.title ?? id}`, detail: `status=${body.status}`, ip: getClientIp(req) });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui." }, { status: 500 });
  }
}
