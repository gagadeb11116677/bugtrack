import crypto from "crypto";
import { db } from "./db";
import { cookies } from "next/headers";

const SESSION_COOKIE = "bugtrack_session";
const SESSION_DAYS = 30;

/** Hash a password using scrypt (Node built-in, no deps). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify a password against stored hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  } catch {
    return false;
  }
}

/** Create a session token + store in DB + set cookie. */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
  return token;
}

/** Verify session token from cookie + return user. */
export async function getSessionUser(): Promise<{ id: string; email: string; name: string; avatarUrl: string | null } | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } });
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

/** Delete session + clear cookie. */
export async function destroySession(): Promise<void> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      await db.session.deleteMany({ where: { token } });
    }
  } catch { /* ignore */ }
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionCookieMaxAge = SESSION_DAYS * 24 * 60 * 60;
