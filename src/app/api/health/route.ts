import { NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — deployment diagnostics.
 *
 * Storage check runs SERVER-side (no CORS involved), so:
 *  - storage.ok=true  + phone uploads still failing  -> bucket CORS policy
 *  - storage.ok=false -> credentials/bucket/account problem (see error code)
 * Reports only presence booleans and AWS error names — no secret values.
 */
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    APP_URL: Boolean(process.env.APP_URL),
    R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    R2_BUCKET: Boolean(process.env.R2_BUCKET),
    R2_PUBLIC_BASE_URL: Boolean(process.env.R2_PUBLIC_BASE_URL),
  };

  let database: { ok: boolean; error?: string } = { ok: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true };
  } catch (err: any) {
    database = { ok: false, error: err?.name ?? "DatabaseError" };
  }

  let storage: { ok: boolean; mode: string; error?: string } = {
    ok: false,
    mode: r2Configured() ? "r2" : "local-fallback",
  };
  if (!r2Configured()) {
    // Local dev disk storage always "works" but is NOT durable on Railway.
    storage.ok = true;
  } else {
    try {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
      const key = `health/ping-${Date.now()}.txt`;
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: key,
          Body: "ok",
          ContentType: "text/plain",
        })
      );
      await client.send(
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
      );
      storage.ok = true;
    } catch (err: any) {
      storage = {
        ok: false,
        mode: "r2",
        // AWS error names are diagnostic and non-secret, e.g.
        // InvalidAccessKeyId, SignatureDoesNotMatch, NoSuchBucket, AccessDenied
        error: err?.name ?? err?.Code ?? "StorageError",
      };
    }
  }

  const ok = database.ok && storage.ok;
  return NextResponse.json(
    {
      ok,
      env,
      database,
      storage,
      hint: !storage.ok
        ? "Server-side R2 access failed — check credentials/bucket/account-id (see storage.error)."
        : storage.mode === "r2"
          ? "Server-side R2 access works. If phone uploads still fail, the bucket CORS policy does not allow your app origin."
          : "R2 not configured — using non-durable local disk storage.",
    },
    { status: ok ? 200 : 500 }
  );
}
