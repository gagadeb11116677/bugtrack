import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/chat — last 50 messages with reactions + user avatars
export async function GET() {
  const items = await db.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { reactions: true },
  });
  // Get avatars for unique authors
  const authors = [...new Set(items.map((m) => m.author))];
  const users = await db.user.findMany({
    where: { name: { in: authors } },
    select: { name: true, avatarUrl: true },
  });
  const avatarMap = new Map(users.map((u) => [u.name, u.avatarUrl]));

  const enriched = items.reverse().map((m) => ({
    ...m,
    avatarUrl: avatarMap.get(m.author) || null,
  }));

  return NextResponse.json({ items: enriched });
}

// POST /api/chat — send a message (supports replyTo). Rate limit: 5 / 5 min.
export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "chat", 20, 5 * 60_000);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const author = String(body.author || "").trim();
  const content = String(body.content || "").trim();
  const replyTo = body.replyTo ? String(body.replyTo) : null;

  // Images: JSON array of URLs (max 4), each must be /uploads/ or http
  const imagesRaw = Array.isArray(body.images) ? body.images : [];
  const images = imagesRaw
    .map((s: unknown) => String(s))
    .filter((s: string) => s.startsWith("/uploads/") || s.startsWith("http"))
    .slice(0, 4);

  if (author.length < 1) return NextResponse.json({ error: "Isi nama kamu." }, { status: 400 });
  if (content.length < 1 && images.length === 0) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Maks 500 karakter." }, { status: 400 });

  // Validate replyTo exists
  if (replyTo) {
    const exists = await db.chatMessage.findUnique({ where: { id: replyTo }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Pesan asli tidak ditemukan." }, { status: 400 });
  }

  try {
    const msg = await db.chatMessage.create({
      data: {
        author: author.slice(0, 80),
        content: content.slice(0, 500),
        images: images.length ? JSON.stringify(images) : null,
        replyTo,
        ip: getClientIp(req),
      },
      include: { reactions: true },
    });
    return NextResponse.json(msg, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal mengirim." }, { status: 500 });
  }
}
