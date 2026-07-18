import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[slug]/google/auth?key=ADMIN_TOKEN
 * Kicks off the Google OAuth consent flow for the 1-click Drive sync.
 * Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const { event, authorized } = await requireEventAdmin(req, params.slug);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return NextResponse.json(
      { error: "Google sync not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 501 }
    );

  const origin = process.env.APP_URL || req.nextUrl.origin;
  const redirectUri = `${origin}/api/google/callback`;
  // state carries slug+key through the round-trip so the callback can
  // authorize and locate the event without a session store.
  const state = Buffer.from(
    JSON.stringify({ slug: event.slug, key: event.adminToken })
  ).toString("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
