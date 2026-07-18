import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

/** Print-ready A5 table sign: open in browser → Cmd/Ctrl+P → done. */
export default async function SignPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;
  const event = await prisma.event.findUnique({
    where: { slug: normalizeSlug(params.slug) },
    select: { slug: true, name: true },
  });
  if (!event) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6 print:bg-white print:p-0">
      <div className="w-[420px] rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-xl print:border-0 print:shadow-none">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-600">SnapEvent</p>
        <h1 dir="rtl" className="mt-3 font-display text-3xl font-bold text-neutral-900">
          {event.name}
        </h1>
        <p dir="rtl" className="mt-2 text-lg text-neutral-600">
          צלמתם משהו שווה? שתפו אותנו! 📸
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/events/${event.slug}/qr?size=600`}
          alt="Scan to share your photos"
          className="mx-auto my-6 w-64"
        />
        <p dir="rtl" className="text-sm leading-relaxed text-neutral-500">
          סרקו את הברקוד עם המצלמה של הטלפון
          <br />
          בלי אפליקציה · בלי הרשמה · התמונות עולות למסך הגדול!
        </p>
        <p className="mt-3 text-xs leading-relaxed text-neutral-400">
          Scan with your phone camera · No app, no signup
          <br />
          Your photos go up on the big screen!
        </p>
      </div>
      <p className="no-print fixed bottom-6 right-6 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white">
        Press Ctrl/Cmd+P to print
      </p>
    </main>
  );
}
