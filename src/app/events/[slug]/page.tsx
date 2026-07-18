import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import GuestApp from "@/components/GuestApp";

export const dynamic = "force-dynamic";

export default async function GuestPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
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
      paymentStatus: true,
    },
  });
  if (!event || event.paymentStatus !== "PAID") notFound();

  return (
    <GuestApp
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        type: event.type,
        theme: event.theme,
        allowVideo: event.packageType !== "BASIC",
      }}
    />
  );
}
