import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory typing indicators (per IP, 3s expiry)
type TypingState = { isTyping: boolean; expiresAt: number };
const typingMap = new Map<string, TypingState>();

// POST /api/chat/typing — set/clear typing status
// Body: { typing: boolean }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const typing = Boolean(body.typing);

  if (typing) {
    typingMap.set(ip, { isTyping: true, expiresAt: Date.now() + 3000 });
  } else {
    typingMap.delete(ip);
  }

  return NextResponse.json({ ok: true });
}

// GET /api/chat/typing — how many people are typing
export async function GET() {
  const now = Date.now();
  let count = 0;
  for (const [ip, state] of typingMap.entries()) {
    if (state.expiresAt < now) {
      typingMap.delete(ip);
    } else if (state.isTyping) {
      count++;
    }
  }
  return NextResponse.json({ count });
}
