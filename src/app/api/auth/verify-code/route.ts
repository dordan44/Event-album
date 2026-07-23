import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashLoginCode } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

/**
 * POST /api/auth/verify-code — { email, code }
 * Checks the freshest unexpired code for the address; success sets the
 * signed session cookie. Attempts are counted per code so brute-forcing
 * 6 digits inside the 10-minute window is capped at 5 guesses.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Email and 6-digit code are required" }, { status: 400 });

  const record = await prisma.loginCode.findFirst({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record)
    return NextResponse.json({ error: "Code expired or not found" }, { status: 401 });

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.loginCode.deleteMany({ where: { email } });
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  if (record.codeHash !== hashLoginCode(email, code)) {
    await prisma.loginCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
  }

  await prisma.loginCode.deleteMany({ where: { email } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(email), sessionCookieOptions());
  return res;
}
