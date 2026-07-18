import { NextRequest, NextResponse } from "next/server";
import { PassThrough, Readable } from "stream";
import archiver from "archiver";
import { requireEventAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObjectStream, r2Configured } from "@/lib/r2";
import { readLocal } from "@/lib/localStorageFallback";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[slug]/export?key=ADMIN_TOKEN[&status=APPROVED|ALL]
 *
 * Streams a ZIP of the event's media straight from R2 to the host —
 * nothing is buffered to disk, and R2's zero egress fees keep the bulk
 * download free.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const { event, authorized } = await requireEventAdmin(req, params.slug);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("status") === "ALL" ? {} : { status: "APPROVED" as const };
  const media = await prisma.media.findMany({
    where: { eventId: event.id, ...scope },
    orderBy: { createdAt: "asc" },
  });
  if (media.length === 0)
    return NextResponse.json({ error: "No media to export" }, { status: 404 });

  const archive = archiver("zip", { zlib: { level: 1 } }); // webp/mp4 are pre-compressed
  const out = new PassThrough();
  archive.pipe(out);

  (async () => {
    try {
      for (const [i, m] of media.entries()) {
        const ext = m.storageKey.split(".").pop() ?? "bin";
        const nameSafe = m.guestName.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "guest";
        const filename = `${String(i + 1).padStart(4, "0")}-${nameSafe}.${ext}`;
        if (r2Configured()) {
          archive.append((await getObjectStream(m.storageKey)) as Readable, { name: filename });
        } else {
          archive.append(await readLocal(m.storageKey), { name: filename });
        }
      }
      await archive.finalize();
    } catch (err) {
      archive.destroy(err as Error);
    }
  })();

  return new NextResponse(Readable.toWeb(out) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="snapevent-${event.slug}.zip"`,
    },
  });
}
