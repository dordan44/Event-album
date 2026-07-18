/**
 * Slugs may contain Hebrew letters, and Next.js is inconsistent about
 * decoding dynamic params (route handlers get them decoded, pages get them
 * percent-encoded). Normalize before any DB lookup.
 */
export function normalizeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Build a URL-safe slug like "danielle-and-omer-2026". */
export function slugify(name: string, eventDate: Date): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "") // strip Hebrew niqqud
    .replace(/[^a-z0-9א-ת]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const year = eventDate.getFullYear();
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || "event"}-${year}-${rand}`;
}
