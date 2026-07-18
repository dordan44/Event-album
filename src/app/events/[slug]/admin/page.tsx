import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { key?: string };
}) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, adminToken: true, googleRefreshToken: true },
  });
  if (!event) notFound();

  // Wrong/missing key -> present as not-found rather than confirming existence.
  if (searchParams.key !== event.adminToken) notFound();

  return (
    <AdminDashboard
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        googleConnected: Boolean(event.googleRefreshToken),
      }}
      adminKey={event.adminToken}
    />
  );
}
