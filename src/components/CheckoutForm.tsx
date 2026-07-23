"use client";

import { useState } from "react";
import { useLang, type MessageKey } from "@/lib/i18n";

const EVENT_TYPES = ["WEDDING", "BAR_MITZVAH", "BAT_MITZVAH", "BRIT", "BIRTHDAY", "CORPORATE"] as const;
const PACKAGES = [
  { id: "BASIC", price: "₪290" },
  { id: "PREMIUM", price: "₪490" },
] as const;
const THEMES = ["classic", "romance", "night", "festive"] as const;

interface CreatedEvent {
  slug: string;
  guestUrl: string;
  adminUrl: string;
  slideshowUrl: string;
  emailSent: boolean;
}

export default function CheckoutForm() {
  const { t } = useLang();
  const [form, setForm] = useState({
    name: "",
    type: "WEDDING",
    eventDate: "",
    hostEmail: "",
    hostPhone: "",
    packageType: "PREMIUM",
    theme: "classic",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("form.error"));
      setCreated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="animate-slide-up rounded-2xl border border-green-200 bg-green-50 p-8">
        <h3 className="mb-1 font-display text-2xl font-bold text-green-800">{t("created.title")}</h3>
        <p className="mb-6 text-sm text-green-700">{t("created.sub")}</p>
        <ul className="space-y-3 text-sm">
          <LinkRow label={t("created.admin")} href={created.adminUrl} />
          <LinkRow label={t("created.guest")} href={created.guestUrl} />
          <LinkRow label={t("created.slideshow")} href={created.slideshowUrl} />
        </ul>
        <div className="mt-6 border-t border-green-200 pt-4 text-sm text-green-800">
          {created.emailSent && <p className="mb-1">{t("created.emailed")}</p>}
          <p>
            {t("created.dashboardNote")}{" "}
            <a href="/dashboard" className="font-bold underline">
              {t("created.dashboardLink")}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <Field label={t("form.eventType")}>
        <select
          className={inputCls}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {EVENT_TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`type.${v}` as MessageKey)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("form.eventName")}>
        <input
          className={inputCls}
          placeholder={t("form.eventNamePlaceholder")}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("form.eventDate")}>
          <input
            type="date"
            className={inputCls}
            required
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
          />
        </Field>
        <Field label={t("form.phone")}>
          <input
            type="tel"
            className={inputCls}
            placeholder={t("form.phonePlaceholder")}
            required
            value={form.hostPhone}
            onChange={(e) => setForm({ ...form, hostPhone: e.target.value })}
          />
        </Field>
      </div>

      <Field label={t("form.email")}>
        <input
          type="email"
          className={inputCls}
          placeholder={t("form.emailPlaceholder")}
          required
          value={form.hostEmail}
          onChange={(e) => setForm({ ...form, hostEmail: e.target.value })}
        />
      </Field>

      <Field label={t("form.theme")}>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setForm({ ...form, theme: v })}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                form.theme === v
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-neutral-300 text-neutral-600 hover:border-brand-400"
              }`}
            >
              {t(`theme.${v}` as MessageKey)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("form.package")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {PACKAGES.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setForm({ ...form, packageType: p.id })}
              className={`rounded-xl border p-4 text-start transition ${
                form.packageType === p.id
                  ? "border-brand-600 bg-brand-50 ring-2 ring-brand-600"
                  : "border-neutral-200 hover:border-brand-300"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{t(`pkg.${p.id}.title` as MessageKey)}</span>
                <span className="text-lg font-bold text-brand-700">{p.price}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">{t(`pkg.${p.id}.desc` as MessageKey)}</p>
            </button>
          ))}
        </div>
      </Field>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-brand-600 py-3.5 font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? t("form.submitting") : t("form.submit")}
      </button>
      <p className="text-center text-xs text-neutral-400">{t("form.secureNote")}</p>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="font-medium text-green-900">{label}</span>
      <a href={href} className="break-all text-brand-700 underline" target="_blank" rel="noreferrer" dir="ltr">
        {typeof window !== "undefined" ? window.location.origin : ""}{href}
      </a>
    </li>
  );
}
