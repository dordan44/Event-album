import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[slug]/qr — QR code PNG pointing at the guest upload page.
 * ?size=  pixel width (default 600, print-ready at 1200)
 * The printable table-sign page (/events/[slug]/sign) embeds this image.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const params = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { slug: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const size = Math.min(2400, Math.max(120, Number(req.nextUrl.searchParams.get("size")) || 600));
  const origin = process.env.APP_URL || req.nextUrl.origin;
  const guestUrl = `${origin}/events/${event.slug}`;

  const png = await QRCode.toBuffer(guestUrl, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "H", // survives table-print wear and phone glare
    color: { dark: "#1f1f1f", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="snapevent-qr-${event.slug}.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
