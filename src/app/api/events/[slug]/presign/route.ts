import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { presignUpload, r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

/**
 * POST /api/events/[slug]/presign
 *
 * The heart of the media pipe: hands the guest's browser a presigned
 * direct-to-R2 PUT URL so uploads bypass this server entirely.
 * Falls back to a local upload endpoint when R2 isn't configured (dev).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { id: true, paymentStatus: true, packageType: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.paymentStatus !== "PAID")
    return NextResponse.json({ error: "Event not active" }, { status: 402 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contentType = String(body?.contentType ?? "");
  const ext = String(body?.ext ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5);
  if (!ALLOWED_TYPES.has(contentType))
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });

  const isVideo = contentType.startsWith("video/");
  if (isVideo && event.packageType === "BASIC")
    return NextResponse.json(
      { error: "Video uploads require the Premium package" },
      { status: 403 }
    );

  const storageKey = `events/${event.id}/${Date.now()}-${randomUUID()}.${ext}`;

  if (!r2Configured()) {
    return NextResponse.json({
      storageKey,
      uploadUrl: `/api/blob/${encodeURIComponent(storageKey)}`,
      method: "PUT",
      mode: "local",
    });
  }

  const uploadUrl = await presignUpload(storageKey, contentType);
  return NextResponse.json({ storageKey, uploadUrl, method: "PUT", mode: "r2" });
}
