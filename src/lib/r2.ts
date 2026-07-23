import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 storage (S3-compatible, zero egress fees).
 *
 * Uploads NEVER touch the Next.js server: the API hands the guest a
 * presigned PUT URL and the browser uploads straight to R2.
 *
 * When R2 env vars are absent (local development), the app falls back to
 * on-disk storage served through /api/blob — see src/app/api/blob.
 */

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

/**
 * Buckets created under a jurisdiction (e.g. "eu") are ONLY reachable via
 * the jurisdiction-specific endpoint — the default endpoint answers
 * NoSuchBucket for them.
 */
export function r2Endpoint(): string {
  const jurisdiction = process.env.R2_JURISDICTION?.trim().toLowerCase();
  const host = jurisdiction
    ? `${process.env.R2_ACCOUNT_ID}.${jurisdiction}.r2.cloudflarestorage.com`
    : `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return `https://${host}`;
}

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: r2Endpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

const PRESIGN_UPLOAD_TTL = 60 * 10; // 10 minutes to finish an upload
const PRESIGN_VIEW_TTL = 60 * 60 * 6; // 6h — comfortably covers an event night

export async function presignUpload(
  storageKey: string,
  contentType: string
): Promise<string> {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: storageKey,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGN_UPLOAD_TTL }
  );
}

/** Public URL for viewing a stored object. */
export async function mediaUrl(storageKey: string): Promise<string> {
  if (!r2Configured()) {
    return `/api/blob/${encodeURIComponent(storageKey)}`;
  }
  // Prefer a public bucket domain (r2.dev or custom domain) when configured —
  // zero signing cost and CDN-cacheable.
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${storageKey}`;
  }
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: storageKey }),
    { expiresIn: PRESIGN_VIEW_TTL }
  );
}

/** Readable stream of a stored object (used by the ZIP export). */
export async function getObjectStream(
  storageKey: string
): Promise<NodeJS.ReadableStream> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: storageKey })
  );
  return res.Body as unknown as NodeJS.ReadableStream;
}
