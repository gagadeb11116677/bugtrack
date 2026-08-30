import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { adminCookieName, verifyAdminToken } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/users — list all users with stats
export async function GET() {
  const token = (await cookies()).get(adminCookieName)?.value;
  if (!verifyAdminToken(token)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, email: true, name: true, avatarUrl: true, registerIp: true, createdAt: true,
      _count: { select: { sessions: true } },
    },
  });

  // Count activity per user
  const enriched = await Promise.all(
    users.map(async (u) => {
      const [reports, chatMsgs, featureReqs, comments] = await Promise.all([
        db.bugReport.count({ where: { reporterName: u.name } }),
        db.chatMessage.count({ where: { author: u.name } }),
        db.featureRequest.count({ where: { requesterName: u.name } }),
        db.comment.count({ where: { author: u.name } }),
      ]);
      return { ...u, stats: { reports, chatMsgs, featureReqs, comments } };
    })
  );

  return NextResponse.json({ items: enriched });
}
