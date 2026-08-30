import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [total, open, critical, untriaged] = await Promise.all([
    db.bugReport.count(),
    db.bugReport.count({ where: { status: "open" } }),
    db.bugReport.count({ where: { severity: "critical" } }),
    db.bugReport.count({ where: { triaged: false } }),
  ]);
  return NextResponse.json({ total, open, critical, untriaged });
}
