import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { r2Configured } from "@/lib/r2";
import { saveLocal, readLocal } from "@/lib/localStorageFallback";

export const dynamic = "force-dynamic";

/**
 * Local-development storage endpoint, active only when R2 is NOT configured.
 * PUT = upload target handed out by /presign; GET = serve the stored file.
 * In production with R2, uploads go straight to Cloudflare and never hit this.
 */

function keyOf(params: { key: string[] }): string {
  return params.key.map(decodeURIComponent).join("/");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { key: string[] } }
) {
  if (r2Configured())
    return NextResponse.json({ error: "Direct upload disabled — use R2 presigned URLs" }, { status: 400 });

  const storageKey = keyOf(params);
  // Keys are minted by /presign as events/<eventId>/<file>; verify the event.
  const match = storageKey.match(/^events\/([^/]+)\//);
  if (!match)
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  const event = await prisma.event.findUnique({ where: { id: match[1] }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Unknown event" }, { status: 404 });

  const data = Buffer.from(await req.arrayBuffer());
  if (data.length > 120 * 1024 * 1024)
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  await saveLocal(storageKey, data);
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const storageKey = keyOf(params);
    const data = await readLocal(storageKey);
    const ext = storageKey.split(".").pop() ?? "";
    const type =
      ext === "webp" ? "image/webp"
      : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
      : ext === "png" ? "image/png"
      : ext === "mp4" ? "video/mp4"
      : ext === "webm" ? "video/webm"
      : ext === "mov" ? "video/quicktime"
      : "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
