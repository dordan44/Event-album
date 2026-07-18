import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import { mediaUrl } from "@/lib/r2";
import { emitToEvent } from "@/lib/realtime";
import { requireEventAdmin } from "@/lib/auth";
import { MediaStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/events/[slug]/media — the guest confirms a finished direct
 * upload; we record it (PENDING) and push it live to the admin dashboard.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { slug: normalizeSlug(params.slug) },
    select: { id: true, paymentStatus: true },
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

  const storageKey = String(body?.storageKey ?? "");
  const guestName = String(body?.guestName ?? "").trim().slice(0, 60);
  const type = body?.type === "VIDEO" ? "VIDEO" : "IMAGE";
  const sizeBytes = Number.isFinite(body?.sizeBytes) ? Math.max(0, body.sizeBytes) : 0;

  // The key must belong to THIS event — prevents cross-event injection.
  if (!storageKey.startsWith(`events/${event.id}/`))
    return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
  if (!guestName)
    return NextResponse.json({ error: "Guest name is required" }, { status: 400 });

  const media = await prisma.media.create({
    data: { eventId: event.id, storageKey, guestName, type, sizeBytes },
  });

  const url = await mediaUrl(storageKey);
  emitToEvent(event.id, "media:new", {
    id: media.id,
    url,
    guestName,
    type,
    status: media.status,
    createdAt: media.createdAt,
  });

  return NextResponse.json({ id: media.id, status: media.status }, { status: 201 });
}

/**
 * GET /api/events/[slug]/media?status=PENDING|APPROVED|REJECTED
 *
 * APPROVED is public (slideshow bootstrap). Everything else requires the
 * admin key.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const statusParam = req.nextUrl.searchParams.get("status");
  const status =
    statusParam && (Object.values(MediaStatus) as string[]).includes(statusParam)
      ? (statusParam as MediaStatus)
      : null;

  if (status === "APPROVED") {
    const event = await prisma.event.findUnique({
      where: { slug: normalizeSlug(params.slug) },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const items = await prisma.media.findMany({
      where: { eventId: event.id, status: "APPROVED" },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ items: await withUrls(items) });
  }

  const { event, authorized } = await requireEventAdmin(req, params.slug);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, total, approved] = await Promise.all([
    prisma.media.findMany({
      where: { eventId: event.id, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.media.count({ where: { eventId: event.id } }),
    prisma.media.count({ where: { eventId: event.id, status: "APPROVED" } }),
  ]);

  return NextResponse.json({
    items: await withUrls(items),
    stats: { total, approved },
  });
}

async function withUrls(
  items: { id: string; storageKey: string; guestName: string; status: string; type: string; createdAt: Date }[]
) {
  return Promise.all(
    items.map(async (m) => ({
      id: m.id,
      url: await mediaUrl(m.storageKey),
      guestName: m.guestName,
      status: m.status,
      type: m.type,
      createdAt: m.createdAt,
    }))
  );
}
