import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

/** GET /api/events/[slug] — public event metadata for the guest app. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { slug: normalizeSlug(params.slug) },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      eventDate: true,
      packageType: true,
      theme: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}
