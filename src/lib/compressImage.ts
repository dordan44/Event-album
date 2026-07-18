"use client";

/**
 * The Processing Engine (client-side).
 *
 * Compresses every image IN THE BROWSER before a single byte goes over the
 * air: downsized to max 1200px on the long edge and re-encoded to WebP,
 * targeting ~500KB per image so venue Wi-Fi / cellular never clogs.
 */
const MAX_DIMENSION = 1200;
const TARGET_BYTES = 500 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];

export interface CompressedImage {
  blob: Blob;
  contentType: string;
  ext: string;
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Unsupported/corrupt image — send as-is rather than losing the moment.
    return { blob: file, contentType: file.type || "image/jpeg", ext: extOf(file) };
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, contentType: file.type || "image/jpeg", ext: extOf(file) };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Walk quality down until we hit ~500KB (or run out of steps).
  let best: Blob | null = null;
  for (const q of QUALITY_STEPS) {
    const blob = await toBlob(canvas, "image/webp", q);
    if (!blob) break;
    best = blob;
    if (blob.size <= TARGET_BYTES) break;
  }

  if (best) return { blob: best, contentType: "image/webp", ext: "webp" };
  // Browser can't encode webp (very old Safari) — fall back to JPEG.
  const jpeg = await toBlob(canvas, "image/jpeg", 0.8);
  if (jpeg) return { blob: jpeg, contentType: "image/jpeg", ext: "jpg" };
  return { blob: file, contentType: file.type || "image/jpeg", ext: extOf(file) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality)
  );
}

function extOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  return file.type.split("/")[1] || "bin";
}

/** Videos are size-capped rather than transcoded (no browser transcoding). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
