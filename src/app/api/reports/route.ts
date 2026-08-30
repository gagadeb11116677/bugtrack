import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;
  const severity = sp.get("severity") || undefined;
  const category = sp.get("category") || undefined;
  const product = sp.get("product") || undefined;
  const search = sp.get("search")?.trim() || undefined;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "15", 10) || 15));
  const admin = sp.get("admin") === "1";
  const sort = sp.get("sort") || "newest";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (product) where.product = product;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { reporterName: { contains: search } },
    ];
  }
  if (!admin && !status) where.NOT = { status: "closed" };

  const orderBy = [
    { pinned: "desc" as const },
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "top"
        ? { upvotes: "desc" as const }
        : sort === "views"
          ? { views: "desc" as const }
          : { createdAt: "desc" as const },
  ];

  const [items, total] = await Promise.all([
    db.bugReport.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { comments: true, replies: true } } },
    }),
    db.bugReport.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}

export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "report", LIMITS.report.max, LIMITS.report.windowMs);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    if (!title || title.length < 3) return NextResponse.json({ error: "Judul minimal 3 karakter." }, { status: 400 });
    if (!description || description.length < 10) return NextResponse.json({ error: "Deskripsi minimal 10 karakter." }, { status: 400 });

    const shotsRaw = Array.isArray(body.screenshots) ? body.screenshots : [];
    const screenshots = shotsRaw
      .map((s: unknown) => String(s))
      .filter((s: string) => s.startsWith("/uploads/") || s.startsWith("http"))
      .slice(0, 6);

    const report = await db.bugReport.create({
      data: {
        title,
        description,
        stepsToReproduce: body.stepsToReproduce ? String(body.stepsToReproduce).trim() : null,
        product: body.product === "md" ? "md" : "jpm",
        severity: body.severity || "medium",
        category: body.category || "other",
        status: "open",
        screenshots: screenshots.length ? JSON.stringify(screenshots) : null,
        reporterName: String(body.reporterName || "Anonim").trim().slice(0, 80),
        reporterEmail: body.reporterEmail ? String(body.reporterEmail).trim().slice(0, 160) : null,
        environment: body.environment ? String(body.environment).trim().slice(0, 200) : null,
      },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (e) {
    console.error("[reports/create]", e);
    return NextResponse.json({ error: "Gagal menyimpan laporan." }, { status: 500 });
  }
}
