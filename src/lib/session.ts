import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Host dashboard sessions: an HMAC-signed cookie carrying the verified
 * email. No server-side session store — the signature is the proof.
 * Set SESSION_SECRET in production; the dev fallback keeps local flows
 * working but is publicly known.
 */

export const SESSION_COOKIE = "snapevent_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production")
    console.warn("[session] SESSION_SECRET not set — using insecure dev secret");
  return "snapevent-dev-secret-do-not-use-in-prod";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.email !== "string" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return data.email.toLowerCase();
  } catch {
    return null;
  }
}

/** Verified host email for the current request, or null. (Server components & route handlers.) */
export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
