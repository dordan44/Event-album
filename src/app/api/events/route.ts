import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { sendEmail, eventCreatedEmail } from "@/lib/email";
import { EventType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PACKAGES = new Set(["BASIC", "PREMIUM", "VIP"]);
const THEMES = new Set(["classic", "romance", "night", "festive"]);

/**
 * POST /api/events — checkout: create an event and return the host's
 * private admin link.
 *
 * Payment: the request is the integration point for a local Israeli
 * gateway (Yaad / Meshulam / Grow). Until PAYMENT_PROVIDER is configured,
 * events are created immediately as PAID so the flow is fully testable;
 * with a provider configured you would redirect to its hosted page and
 * flip paymentStatus in its server-to-server callback.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, type, eventDate, hostEmail, hostPhone, packageType, theme } = body ?? {};

  if (!name || typeof name !== "string" || name.length > 120)
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  if (!Object.values(EventType).includes(type))
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  const date = new Date(eventDate);
  if (isNaN(date.getTime()))
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  if (!hostEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(hostEmail))
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (!hostPhone || typeof hostPhone !== "string" || hostPhone.length > 20)
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  const pkg = PACKAGES.has(packageType) ? packageType : "BASIC";
  const chosenTheme = THEMES.has(theme) ? theme : "classic";

  const event = await prisma.event.create({
    data: {
      slug: slugify(name, date),
      name,
      type,
      eventDate: date,
      // Lowercased so dashboard sign-in (keyed by verified email) matches.
      hostEmail: hostEmail.trim().toLowerCase(),
      hostPhone,
      packageType: pkg,
      theme: chosenTheme,
      // No gateway configured -> auto-mark PAID (dev/test mode).
      paymentStatus: process.env.PAYMENT_PROVIDER ? "PENDING" : "PAID",
    },
  });

  const guestUrl = `/events/${event.slug}`;
  const adminUrl = `/events/${event.slug}/admin?key=${event.adminToken}`;
  const slideshowUrl = `/events/${event.slug}/slideshow`;

  // Email the host their links so a closed tab never strands them.
  // Never blocks checkout — the dashboard remains the fallback.
  const origin = process.env.APP_URL || req.nextUrl.origin;
  const tpl = eventCreatedEmail({
    eventName: event.name,
    adminUrl: `${origin}${adminUrl}`,
    guestUrl: `${origin}${guestUrl}`,
    slideshowUrl: `${origin}${slideshowUrl}`,
    dashboardUrl: `${origin}/dashboard`,
  });
  const emailResult = await sendEmail({
    to: event.hostEmail,
    subject: tpl.subject,
    html: tpl.html,
  });

  return NextResponse.json(
    {
      id: event.id,
      slug: event.slug,
      guestUrl,
      adminUrl,
      slideshowUrl,
      paymentStatus: event.paymentStatus,
      emailSent: emailResult.sent,
    },
    { status: 201 }
  );
}
