import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/user-auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// POST /api/user/update — update name + upload avatar
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const blocked = enforceRateLimit(req, "upload", LIMITS.upload.max, LIMITS.upload.windowMs);
  if (blocked) return blocked;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });

  const data: Record<string, unknown> = {};
  const name = String(form.get("name") || "").trim();
  if (name.length >= 1 && name !== user.name) {
    data.name = name.slice(0, 80);
  }

  const file = form.get("avatar");
  if (file instanceof File) {
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      return NextResponse.json({ error: "Format harus PNG, JPEG, WebP, atau GIF." }, { status: 415 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran maksimal 5MB." }, { status: 413 });
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const name2 = `avatar_${user.id}_${Date.now()}.${ext}`;

    // Vercel Blob or local
    if (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`bugtrack/${name2}`, file, { access: "public", contentType: file.type });
        data.avatarUrl = blob.url;
      } catch {
        return NextResponse.json({ error: "Gagal upload avatar." }, { status: 500 });
      }
    } else {
      // Local dev fallback
      const path = await import("path");
      const { writeFile, mkdir } = await import("fs/promises");
      const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
      await mkdir(UPLOAD_DIR, { recursive: true });
      const buf = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(UPLOAD_DIR, name2), buf);
      data.avatarUrl = `/uploads/${name2}`;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  try {
    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui profil." }, { status: 500 });
  }
}
