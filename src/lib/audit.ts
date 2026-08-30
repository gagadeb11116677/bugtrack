import { NextRequest } from "next/server";
import { db } from "./db";

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function logAudit(opts: {
  action: string;
  actor?: string;
  target?: string | null;
  detail?: string | null;
  ip?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        action: opts.action,
        actor: opts.actor ?? "admin",
        target: opts.target ?? null,
        detail: opts.detail ?? null,
        ip: opts.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to record", e);
  }
}
