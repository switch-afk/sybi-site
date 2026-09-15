import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sybi_admin";
const SESSION_DAYS = 7;

function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set. Add it to .env.local before using /admin.");
  }
  return password;
}

/** Token is `expiry.signature`, signed with the admin password itself,
 *  so changing the password logs every session out. */
function sign(expiry: number): string {
  return crypto.createHmac("sha256", adminPassword()).update(`sybi:${expiry}`).digest("hex");
}

export function createToken(): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiry = Date.now() + maxAge * 1000;
  return { value: `${expiry}.${sign(expiry)}`, maxAge };
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiry = Number(rawExpiry);
  if (!expiry || !signature || Date.now() > expiry) return false;
  try {
    return safeEqual(signature, sign(expiry));
  } catch {
    return false;
  }
}

export function checkPassword(candidate: unknown): boolean {
  if (typeof candidate !== "string") return false;
  try {
    return safeEqual(candidate, adminPassword());
  } catch {
    return false;
  }
}

export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
