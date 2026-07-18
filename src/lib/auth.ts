import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { normalizeSlug } from "./slug";

/**
 * Admin access to an event is gated by the event's secret adminToken,
 * generated at checkout and delivered to the host. It is accepted either
 * as a Bearer token or a `?key=` query param (so the dashboard link can be
 * shared with a designated moderator, e.g. a bridesmaid).
 */
export function extractAdminKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.nextUrl.searchParams.get("key");
}

export async function requireEventAdmin(req: NextRequest, slug: string) {
  const event = await prisma.event.findUnique({ where: { slug: normalizeSlug(slug) } });
  if (!event) return { event: null, authorized: false as const };
  const key = extractAdminKey(req);
  return { event, authorized: Boolean(key && key === event.adminToken) };
}
