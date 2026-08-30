import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// GET /api/user/profile — get logged-in user's activity (reports, chat messages)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const [myReports, myChatMessages, myFeatureRequests, myComments] = await Promise.all([
    db.bugReport.findMany({
      where: { reporterName: user.name },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, status: true, severity: true, product: true, createdAt: true, upvotes: true, views: true, pinned: true },
    }),
    db.chatMessage.findMany({
      where: { author: user.name },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, content: true, createdAt: true },
    }),
    db.featureRequest.findMany({
      where: { requesterName: user.name },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, status: true, upvotes: true, product: true, createdAt: true },
    }),
    db.comment.findMany({
      where: { author: user.name },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { report: { select: { id: true, title: true } } },
    }),
  ]);

  return NextResponse.json({
    user,
    stats: {
      reports: myReports.length,
      chatMessages: myChatMessages.length,
      featureRequests: myFeatureRequests.length,
      comments: myComments.length,
    },
    activity: {
      reports: myReports,
      chatMessages: myChatMessages,
      featureRequests: myFeatureRequests,
      comments: myComments,
    },
  });
}
