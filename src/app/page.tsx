"use client";

import CheckoutForm from "@/components/CheckoutForm";
import { LangToggle, useLang } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      <div className="fixed left-4 top-4 z-30">
        <LangToggle />
      </div>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-600">
          SnapEvent
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-neutral-900 sm:text-6xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
          {t("landing.heroSub")}
        </p>
      </header>

      {/* Live preview mock: LED screen + phone */}
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 pb-16 sm:flex-row sm:justify-center">
        <div className="relative w-full max-w-xl rounded-xl bg-neutral-950 p-3 shadow-2xl">
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black">
            <div className="grid w-full grid-cols-3 gap-1 p-2 opacity-90">
              {["🥂", "💃", "🎉", "📸", "💍", "🎊"].map((e, i) => (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded bg-neutral-800 text-4xl animate-fade-in"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-neutral-400">{t("landing.screenCaption")}</p>
        </div>
        <div className="w-40 shrink-0 rounded-[2rem] border-4 border-neutral-800 bg-white p-3 shadow-xl">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-neutral-300" />
          <div className="rounded-lg bg-brand-50 p-3 text-center">
            <div className="mx-auto mb-2 grid h-20 w-20 grid-cols-4 gap-0.5 rounded bg-white p-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={`rounded-[1px] ${i % 3 ? "bg-neutral-900" : "bg-white"}`} />
              ))}
            </div>
            <p className="text-[10px] font-medium text-neutral-700">{t("landing.phoneCaption")}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-neutral-100 bg-white py-14">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
          {([
            ["landing.step1Title", "landing.step1Body"],
            ["landing.step2Title", "landing.step2Body"],
            ["landing.step3Title", "landing.step3Body"],
          ] as const).map(([titleKey, bodyKey]) => (
            <div key={titleKey}>
              <h3 className="mb-2 font-display text-xl font-bold text-brand-700">{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed text-neutral-600">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checkout */}
      <section id="checkout" className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="mb-2 text-center font-display text-3xl font-bold">
          {t("landing.checkoutTitle")}
        </h2>
        <p className="mb-8 text-center text-neutral-600">{t("landing.checkoutSub")}</p>
        <CheckoutForm />
      </section>

      <footer className="border-t border-neutral-100 py-8 text-center text-xs text-neutral-400">
        {t("landing.footer")}
      </footer>
    </main>
  );
}
