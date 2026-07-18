import Link from "next/link";

/**
 * App-wide 404 — also rendered by notFound() from event pages (bad slug,
 * wrong admin key, unpaid event). Guests land here from mistyped QR links,
 * so it's bilingual and points them somewhere useful.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-6">
      <div className="w-full max-w-md animate-slide-up rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">SnapEvent</p>

        <div className="my-6 text-7xl" aria-hidden>
          📷
        </div>
        <p className="font-display text-6xl font-bold text-neutral-200">404</p>

        <h1 dir="rtl" className="mt-4 font-display text-2xl font-bold text-neutral-900">
          אופס, העמוד לא נמצא
        </h1>
        <p dir="rtl" className="mt-2 text-sm leading-relaxed text-neutral-600">
          יכול להיות שהקישור שגוי, שהאירוע כבר לא פעיל,
          <br />
          או שהברקוד הוביל לכתובת לא נכונה.
        </p>

        <h2 className="mt-5 text-lg font-bold text-neutral-700">Page not found</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
          The link may be wrong, or this event is no longer active.
        </p>

        <div dir="rtl" className="mt-8 space-y-3">
          <Link
            href="/"
            className="block w-full rounded-xl bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700"
          >
            לעמוד הבית · Back home
          </Link>
          <p className="text-xs text-neutral-400">
            אורחים באירוע? סרקו שוב את הברקוד שעל השולחן 📱
            <br />
            <span className="text-neutral-300">Guests: try re-scanning the QR code on your table</span>
          </p>
        </div>
      </div>
    </main>
  );
}
