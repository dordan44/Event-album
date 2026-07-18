# SnapEvent 📸

Real-time event media sharing for weddings, bar/bat mitzvahs, and corporate events.
Guests scan a table QR code, upload photos with zero friction (no app, no signup),
hosts moderate live, and approved photos appear instantly on the venue screen.

## Architecture

- **Next.js 14 (App Router)** on a **custom Node server** (`server.js`) that runs
  **Socket.io** in the same process/port — API routes broadcast real-time events directly.
- **Prisma + PostgreSQL** (Railway managed instance).
- **Cloudflare R2** for media, via **presigned direct-to-storage uploads** — the media
  pipe fully bypasses the app server, so hundreds of simultaneous guest uploads never
  choke it. Zero egress fees make bulk ZIP export and slideshow streaming cheap.
- **Client-side compression**: images are downscaled to max 1200px and re-encoded to
  WebP (~500KB) in the guest's browser *before* upload — venue Wi-Fi stays healthy.

## The three surfaces

| Surface | URL | Who |
| --- | --- | --- |
| Guest upload app (Hebrew, RTL) | `/events/[slug]` | Guests, via table QR |
| Admin dashboard | `/events/[slug]/admin?key=ADMIN_TOKEN` | Host / designated moderator |
| Venue slideshow | `/events/[slug]/slideshow` | DJ / AV screen |

Plus: `/` (marketing + checkout) and `/events/[slug]/sign` (print-ready A5 table sign).

## Real-time flow

1. Guest confirms an upload → `media:new` pushed to the admin room.
2. Host taps **Approve** → `media:approved` pushed to the slideshow room → the photo
   crossfades onto the venue screen within a second, jumping the rotation queue.
3. Host taps **Reject** on an approved item → it is pulled off the screen live.
4. Guest connections are counted → live "guests online" stat on the dashboard.

## Local development

```bash
npm install
cp .env.example .env        # set DATABASE_URL (any Postgres works)
npx prisma migrate dev      # create schema
npm run dev                 # custom server on http://localhost:3000
```

Without R2 credentials the app transparently falls back to on-disk storage
(`.uploads/`, served via `/api/blob/...`) so the full flow — compression, "presigned"
upload, moderation, slideshow, ZIP export — works locally.

## Deploying to Railway

1. Create a Railway project with **PostgreSQL** and this repo (Dockerfile is detected;
   `railway.json` pins the config). The container runs `prisma migrate deploy` on boot.
2. Set env vars from `.env.example` (`DATABASE_URL` is injected by Railway;
   set `APP_URL` and the four `R2_*` values).
3. Create an R2 bucket and an API token with Object Read & Write. Add a CORS rule to
   the bucket allowing `PUT` from your `APP_URL` origin.

### Integration points intentionally left pluggable

- **Payments** (Yaad/Meshulam/Grow): `POST /api/events` is the checkout endpoint.
  Until `PAYMENT_PROVIDER` is set, events activate immediately (test mode); with a
  provider, redirect to its hosted page and flip `paymentStatus` in the S2S callback.
- **Google Drive sync**: fully implemented (`drive.file` scope) — just supply
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` with redirect URI `{APP_URL}/api/google/callback`.
