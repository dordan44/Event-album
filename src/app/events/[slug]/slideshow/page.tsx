import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Slideshow from "@/components/Slideshow";

export const dynamic = "force-dynamic";

export default async function SlideshowPage({ params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, packageType: true, paymentStatus: true },
  });
  if (!event || event.paymentStatus !== "PAID") notFound();

  return <Slideshow eventId={event.id} slug={event.slug} />;
}
