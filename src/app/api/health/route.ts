import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { presignUpload, r2Configured } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — deployment diagnostics.
 *
 * Storage check runs SERVER-side (no CORS involved), so:
 *  - storage.ok=true  + phone uploads still failing  -> bucket CORS policy
 *  - storage.ok=false -> credentials/bucket/account problem (see error code)
 * Reports only presence booleans and AWS error names — no secret values.
 */
export async function GET(req: NextRequest) {
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

  // Simulate the EXACT preflight the guest's browser sends before its
  // direct-to-R2 PUT, and report what the bucket's CORS policy answers.
  type CorsResult = {
    ok: boolean;
    testedOrigin?: string;
    status?: number;
    allowOrigin?: string | null;
    allowMethods?: string | null;
    allowHeaders?: string | null;
    error?: string;
  };
  let cors: CorsResult | { skipped: string } = { skipped: "R2 not configured" };
  if (r2Configured() && storage.ok) {
    // Prefer the origin this request actually came through — that's the
    // origin guests' browsers will send. APP_URL is the fallback.
    const testedOrigin = process.env.APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    try {
      const url = await presignUpload("health/cors-test.webp", "image/webp");
      const res = await fetch(url, {
        method: "OPTIONS",
        headers: {
          Origin: testedOrigin,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      const allowOrigin = res.headers.get("access-control-allow-origin");
      const allowMethods = res.headers.get("access-control-allow-methods");
      const allowHeaders = res.headers.get("access-control-allow-headers");
      cors = {
        ok:
          res.ok &&
          Boolean(allowOrigin && (allowOrigin === "*" || allowOrigin === testedOrigin)) &&
          Boolean(allowMethods?.toUpperCase().includes("PUT")),
        testedOrigin,
        status: res.status,
        allowOrigin,
        allowMethods,
        allowHeaders,
      };
    } catch (err: any) {
      cors = { ok: false, testedOrigin, error: err?.name ?? "CorsCheckError" };
    }
  }

  const corsOk = "skipped" in cors || cors.ok;
  const ok = database.ok && storage.ok && corsOk;
  return NextResponse.json(
    {
      ok,
      env,
      database,
      storage,
      cors,
      hint: !storage.ok
        ? "Server-side R2 access failed — check credentials/bucket/account-id (see storage.error)."
        : !corsOk
          ? "R2 credentials work, but the bucket CORS policy rejects the browser preflight for cors.testedOrigin — fix AllowedOrigins/AllowedMethods/AllowedHeaders on the bucket. Also make sure testedOrigin is the URL guests actually browse (APP_URL)."
          : storage.mode === "r2"
            ? "Storage and CORS look good. If uploads still fail, retry in a fresh tab (Safari caches preflights)."
            : "R2 not configured — using non-durable local disk storage.",
    },
    { status: ok ? 200 : 500 }
  );
}
