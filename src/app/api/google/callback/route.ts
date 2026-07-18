import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** OAuth redirect URI: stores the refresh token, bounces back to the dashboard. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  if (!code || !stateRaw)
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });

  let state: { slug: string; key: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "Bad state" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { slug: state.slug } });
  if (!event || event.adminToken !== state.key)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = process.env.APP_URL || req.nextUrl.origin;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.refresh_token)
    return NextResponse.json({ error: "Token exchange failed", detail: tokens }, { status: 502 });

  await prisma.event.update({
    where: { id: event.id },
    data: { googleRefreshToken: tokens.refresh_token },
  });

  return NextResponse.redirect(
    `${origin}/events/${event.slug}/admin?key=${event.adminToken}&google=connected`
  );
}
