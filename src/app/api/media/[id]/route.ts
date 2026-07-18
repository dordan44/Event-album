import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mediaUrl } from "@/lib/r2";
import { emitToEvent } from "@/lib/realtime";
import { extractAdminKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/media/[id] — moderation: { action: "APPROVE" | "REJECT" }.
 * On approval the image is pushed to the venue slideshow in real time.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const media = await prisma.media.findUnique({
    where: { id: params.id },
    include: { event: { select: { id: true, adminToken: true } } },
  });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = extractAdminKey(req);
  if (!key || key !== media.event.adminToken)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const action = body?.action;
  if (action !== "APPROVE" && action !== "REJECT")
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
  const updated = await prisma.media.update({
    where: { id: media.id },
    data: { status },
  });

  const payload = {
    id: updated.id,
    url: await mediaUrl(updated.storageKey),
    guestName: updated.guestName,
    type: updated.type,
    status,
    createdAt: updated.createdAt,
  };
  emitToEvent(media.event.id, status === "APPROVED" ? "media:approved" : "media:rejected", payload);

  return NextResponse.json({ id: updated.id, status });
}
