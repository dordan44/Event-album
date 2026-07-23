"use client";

import { useState } from "react";
import { LangToggle, useLang, type MessageKey } from "@/lib/i18n";

export interface DashboardEvent {
  id: string;
  slug: string;
  name: string;
  type: string;
  eventDate: string; // ISO
  packageType: string;
  paymentStatus: string;
  googleConnected: boolean;
  adminUrl: string;
  guestUrl: string;
  slideshowUrl: string;
  totalMedia: number;
  approvedMedia: number;
  pendingMedia: number;
}

const TYPE_EMOJI: Record<string, string> = {
  WEDDING: "💍",
  BAR_MITZVAH: "🎊",
  BAT_MITZVAH: "✨",
  BRIT: "👶",
  BIRTHDAY: "🎂",
  CORPORATE: "🏢",
};

export default function DashboardEvents({
  email,
  events,
}: {
  email: string;
  events: DashboardEvent[];
}) {
  const { t, lang } = useLang();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <header className="border-b border-neutral-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-4">
          <a href="/" className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            SnapEvent
          </a>
          <h1 className="font-display text-lg font-bold text-neutral-900">{t("dash.title")}</h1>
          <div className="ms-auto flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:inline">
              {t("dash.signedInAs")} <b dir="ltr">{email}</b>
            </span>
            <button
              onClick={logout}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-brand-400"
            >
              {t("dash.logout")}
            </button>
            <LangToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {events.length > 0 && `${events.length} ${t("dash.eventsCount")}`}
          </p>
          <a
            href="/#checkout"
            className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            {t("dash.newEvent")}
          </a>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <p className="mb-4 text-neutral-500">{t("dash.empty")}</p>
            <a
              href="/#checkout"
              className="inline-block rounded-xl bg-brand-600 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
            >
              {t("dash.emptyCta")}
            </a>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {events.map((ev) => (
              <EventCard key={ev.id} ev={ev} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EventCard({ ev, lang }: { ev: DashboardEvent; lang: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  const dateStr = new Date(ev.eventDate).toLocaleDateString(
    lang === "he" ? "he-IL" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );

  async function copyGuestLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${ev.guestUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-neutral-900">
          {TYPE_EMOJI[ev.type] ?? "🎉"} {ev.name}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            ev.paymentStatus === "PAID"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {ev.paymentStatus === "PAID" ? t("dash.paid") : t("dash.paymentPending")}
        </span>
      </div>
      <p className="mb-4 text-sm text-neutral-500">
        {t(`type.${ev.type}` as MessageKey)} · {dateStr} ·{" "}
        {t(`pkg.${ev.packageType}.title` as MessageKey)}
      </p>

      <div className="mb-4 flex gap-4 rounded-xl bg-neutral-50 p-3 text-center text-sm">
        <Stat n={ev.totalMedia} label={t("dash.photos")} />
        <Stat n={ev.approvedMedia} label={t("dash.approvedCount")} />
        <Stat n={ev.pendingMedia} label={t("dash.pendingCount")} highlight={ev.pendingMedia > 0} />
      </div>

      <p className={`mb-4 text-xs ${ev.googleConnected ? "text-green-700" : "text-neutral-400"}`}>
        {ev.googleConnected ? t("dash.driveConnected") : t("dash.driveNotConnected")}
      </p>

      <div className="mt-auto space-y-2">
        <a
          href={ev.adminUrl}
          className="block rounded-xl bg-brand-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-brand-700"
        >
          {t("dash.manage")}
        </a>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
          <a href={ev.guestUrl} target="_blank" rel="noreferrer" className={secondaryCls}>
            {t("dash.guestPage")}
          </a>
          <a href={ev.slideshowUrl} target="_blank" rel="noreferrer" className={secondaryCls}>
            {t("dash.slideshow")}
          </a>
          <button onClick={copyGuestLink} className={secondaryCls}>
            {copied ? t("dash.copied") : t("dash.copyGuest")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, highlight = false }: { n: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex-1">
      <div className={`text-lg font-bold ${highlight ? "text-brand-600" : "text-neutral-900"}`}>
        {n}
      </div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

const secondaryCls =
  "rounded-lg border border-neutral-200 px-2 py-2 text-neutral-600 transition hover:border-brand-400 hover:text-brand-700";
