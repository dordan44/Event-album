import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashLoginCode } from "@/lib/auth";
import { sendEmail, loginCodeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000;
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const MAX_CODES_PER_WINDOW = 5;

/**
 * POST /api/auth/request-code — { email }
 * Emails a 6-digit sign-in code. Always answers 200 for valid input so
 * the endpoint doesn't reveal which emails have events. Without an email
 * provider configured, the code is returned in the response outside
 * production so the flow stays testable.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const recent = await prisma.loginCode.count({
    where: { email, createdAt: { gt: new Date(Date.now() - THROTTLE_WINDOW_MS) } },
  });
  if (recent >= MAX_CODES_PER_WINDOW)
    return NextResponse.json({ error: "Too many codes requested. Try again later." }, { status: 429 });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.loginCode.create({
    data: {
      email,
      codeHash: hashLoginCode(email, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  // Opportunistic cleanup of expired codes for this address.
  await prisma.loginCode.deleteMany({ where: { email, expiresAt: { lt: new Date() } } });

  const tpl = loginCodeEmail(code);
  const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

  const devCode =
    !result.sent && process.env.NODE_ENV !== "production" ? code : undefined;
  return NextResponse.json({ ok: true, emailSent: result.sent, ...(devCode && { devCode }) });
}
