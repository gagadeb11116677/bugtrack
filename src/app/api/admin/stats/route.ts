import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const [total, untriaged, byStatus, bySeverity, byCategory, byProduct, topReporters, totalViews, resolvedReports, hotList] = await Promise.all([
    db.bugReport.count(),
    db.bugReport.count({ where: { triaged: false } }),
    db.bugReport.groupBy({ by: ["status"], _count: { _all: true } }),
    db.bugReport.groupBy({ by: ["severity"], _count: { _all: true } }),
    db.bugReport.groupBy({ by: ["category"], _count: { _all: true } }),
    db.bugReport.groupBy({ by: ["product"], _count: { _all: true } }),
    db.bugReport.groupBy({ by: ["reporterName"], _count: { _all: true }, orderBy: { _count: { reporterName: "desc" } }, take: 5 }),
    db.bugReport.aggregate({ _sum: { views: true } }),
    db.bugReport.findMany({ where: { resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } }),
    db.bugReport.findMany({
      where: { status: { in: ["open", "in_progress"] } },
      orderBy: [{ pinned: "desc" }, { upvotes: "desc" }],
      take: 5,
      select: { id: true, title: true, severity: true, product: true, status: true, upvotes: true, pinned: true, createdAt: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach((s) => (statusCounts[s.status] = s._count._all));
  const severityCounts: Record<string, number> = {};
  bySeverity.forEach((s) => (severityCounts[s.severity] = s._count._all));
  const categoryCounts: Record<string, number> = {};
  byCategory.forEach((s) => (categoryCounts[s.category] = s._count._all));
  const productCounts: Record<string, number> = {};
  byProduct.forEach((s) => (productCounts[s.product] = s._count._all));

  const resolved = statusCounts["resolved"] ?? 0;
  const closed = statusCounts["closed"] ?? 0;
  const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0;

  // average resolution time in hours
  let avgResolutionHours = 0;
  if (resolvedReports.length > 0) {
    const totalHours = resolvedReports.reduce((acc, r) => {
      if (!r.resolvedAt) return acc;
      const diffMs = r.resolvedAt.getTime() - r.createdAt.getTime();
      return acc + diffMs / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round((totalHours / resolvedReports.length) * 10) / 10;
  }

  const topReportersArr = topReporters.map((r) => ({ name: r.reporterName, count: r._count._all }));

  return NextResponse.json({
    total, untriaged, resolved, resolutionRate,
    totalViews: totalViews._sum.views ?? 0,
    avgResolutionHours,
    status: statusCounts, severity: severityCounts, category: categoryCounts, product: productCounts,
    topReporters: topReportersArr,
    hotList,
  });
}
