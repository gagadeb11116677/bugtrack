import crypto from "crypto";

const COOKIE_NAME = "bug_admin_token";
const SECRET = process.env.ADMIN_PASSWORD || "admin123456";
const MAX_AGE = 60 * 60 * 24 * 7;

export function createAdminToken(): string {
  const payload = `admin:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  try {
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");
    if (sig.length !== expectedSig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = SECRET;
  if (password.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const adminCookieName = COOKIE_NAME;
export const adminCookieMaxAge = MAX_AGE;
