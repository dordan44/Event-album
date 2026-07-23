import { prisma } from "@/lib/prisma";
import { getSessionEmail } from "@/lib/session";
import DashboardLogin from "@/components/DashboardLogin";
import DashboardEvents, { type DashboardEvent } from "@/components/DashboardEvents";

export const dynamic = "force-dynamic";

/**
 * Host dashboard: every event created with the signed-in email, with
 * links back into the per-event admin. Ownership is keyed on the
 * verified hostEmail (case-insensitive, so pre-dashboard events match),
 * which is why handing out the adminToken link here is safe.
 */
export default async function DashboardPage() {
  const email = await getSessionEmail();
  if (!email) return <DashboardLogin />;

  const events = await prisma.event.findMany({
    where: { hostEmail: { equals: email, mode: "insensitive" } },
    orderBy: { eventDate: "desc" },
  });

  const counts = events.length
    ? await prisma.media.groupBy({
        by: ["eventId", "status"],
        where: { eventId: { in: events.map((e) => e.id) } },
        _count: { _all: true },
      })
    : [];

  const byEvent = new Map<string, { total: number; approved: number; pending: number }>();
  for (const c of counts) {
    const agg = byEvent.get(c.eventId) ?? { total: 0, approved: 0, pending: 0 };
    agg.total += c._count._all;
    if (c.status === "APPROVED") agg.approved += c._count._all;
    if (c.status === "PENDING") agg.pending += c._count._all;
    byEvent.set(c.eventId, agg);
  }

  const serialized: DashboardEvent[] = events.map((ev) => {
    const agg = byEvent.get(ev.id) ?? { total: 0, approved: 0, pending: 0 };
    return {
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      type: ev.type,
      eventDate: ev.eventDate.toISOString(),
      packageType: ev.packageType,
      paymentStatus: ev.paymentStatus,
      googleConnected: Boolean(ev.googleRefreshToken),
      adminUrl: `/events/${ev.slug}/admin?key=${ev.adminToken}`,
      guestUrl: `/events/${ev.slug}`,
      slideshowUrl: `/events/${ev.slug}/slideshow`,
      totalMedia: agg.total,
      approvedMedia: agg.approved,
      pendingMedia: agg.pending,
    };
  });

  return <DashboardEvents email={email} events={serialized} />;
}
