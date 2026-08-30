import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/chat/reaction — toggle emoji reaction on a message
// Body: { messageId, emoji, author }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId || "");
  const emoji = String(body.emoji || "").slice(0, 10);
  const author = String(body.author || "").trim().slice(0, 80);

  if (!messageId || !emoji || !author) {
    return NextResponse.json({ error: "messageId, emoji, author wajib." }, { status: 400 });
  }

  // Check if reaction already exists (toggle)
  const existing = await db.chatReaction.findUnique({
    where: { messageId_author_emoji: { messageId, author, emoji } },
  });

  try {
    if (existing) {
      await db.chatReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, action: "removed" });
    } else {
      await db.chatReaction.create({ data: { messageId, emoji, author } });
      return NextResponse.json({ ok: true, action: "added" });
    }
  } catch {
    return NextResponse.json({ error: "Gagal." }, { status: 500 });
  }
}
