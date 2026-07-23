"use client";

import { useState } from "react";
import { LangToggle, useLang } from "@/lib/i18n";

/**
 * Passwordless sign-in for event hosts: email -> 6-digit emailed code ->
 * signed session cookie. On success the server component re-renders as
 * the event list.
 */
export default function DashboardLogin() {
  const { t } = useLang();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("form.error"));
      setDevCode(data.devCode ?? null);
      setStep("code");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("form.error"));
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-6">
      <div className="fixed left-4 top-4 z-30">
        <LangToggle />
      </div>

      <div className="w-full max-w-md">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-brand-600">
          SnapEvent
        </p>
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 font-display text-2xl font-bold text-neutral-900">
            {t("login.title")}
          </h1>
          <p className="mb-6 text-sm text-neutral-600">{t("login.sub")}</p>

          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <input
                type="email"
                required
                autoFocus
                className={inputCls}
                placeholder={t("form.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className={primaryBtnCls}>
                {busy ? t("login.sending") : t("login.sendCode")}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <p className="text-sm text-neutral-700">
                {t("login.codeSentTo")} <b dir="ltr">{email}</b>
              </p>
              {devCode && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  {t("login.devCode")} <b dir="ltr">{devCode}</b>
                </p>
              )}
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                dir="ltr"
                className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em]`}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtnCls}>
                {busy ? t("login.verifying") : t("login.verify")}
              </button>
              <div className="flex justify-between text-xs">
                <button
                  type="button"
                  className="text-neutral-500 underline hover:text-brand-600"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                  }}
                >
                  {t("login.changeEmail")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="text-neutral-500 underline hover:text-brand-600"
                  onClick={() => requestCode()}
                >
                  {t("login.resend")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const primaryBtnCls =
  "w-full rounded-xl bg-brand-600 py-3 font-bold text-white transition hover:bg-brand-700 disabled:opacity-50";
