import { NextRequest, NextResponse } from "next/server";
import { requireEventAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObjectStream, r2Configured } from "@/lib/r2";
import { readLocal } from "@/lib/localStorageFallback";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/events/[slug]/google/sync?key=ADMIN_TOKEN
 *
 * 1-click sync of all APPROVED media into a Google Drive folder named
 * after the event. Uses the refresh token stored during the OAuth flow.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const { event, authorized } = await requireEventAdmin(req, params.slug);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!event.googleRefreshToken)
    return NextResponse.json({ error: "Google account not connected" }, { status: 400 });

  // Refresh the access token.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: event.googleRefreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok)
    return NextResponse.json({ error: "Google auth expired — reconnect", detail: tokens }, { status: 401 });
  const accessToken: string = tokens.access_token;

  // Create the destination folder.
  const folderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `SnapEvent — ${event.name}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const folder = await folderRes.json();
  if (!folderRes.ok)
    return NextResponse.json({ error: "Failed to create Drive folder", detail: folder }, { status: 502 });

  const media = await prisma.media.findMany({
    where: { eventId: event.id, status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  });

  let uploaded = 0;
  const failures: string[] = [];
  for (const m of media) {
    try {
      const buf = r2Configured()
        ? Buffer.concat(await collect(await getObjectStream(m.storageKey)))
        : await readLocal(m.storageKey);
      const ext = m.storageKey.split(".").pop() ?? "bin";
      const meta = { name: `${m.guestName}-${m.id.slice(0, 8)}.${ext}`, parents: [folder.id] };
      const boundary = "snapevent-" + m.id;
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
        ),
        buf,
        Buffer.from(`\r\n--${boundary}--`),
      ]);
      const up = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body,
        }
      );
      if (up.ok) uploaded++;
      else failures.push(m.id);
    } catch {
      failures.push(m.id);
    }
  }

  return NextResponse.json({
    folderId: folder.id,
    folderUrl: `https://drive.google.com/drive/folders/${folder.id}`,
    uploaded,
    failed: failures.length,
  });
}

async function collect(stream: NodeJS.ReadableStream): Promise<Buffer[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return chunks;
}
