import CheckoutForm from "@/components/CheckoutForm";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-600">
          SnapEvent
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-neutral-900 sm:text-6xl">
          Every guest is your photographer.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
          Guests scan a QR code on their table, share photos in seconds — no app,
          no signup — and approved moments appear live on the venue screen.
          The next morning, the full album is yours in one click.
        </p>
      </header>

      {/* Live preview mock: LED screen + phones */}
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
          <p className="mt-2 text-center text-xs text-neutral-400">
            Live venue slideshow — updates the second you hit “Approve”
          </p>
        </div>
        <div className="w-40 shrink-0 rounded-[2rem] border-4 border-neutral-800 bg-white p-3 shadow-xl">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-neutral-300" />
          <div className="rounded-lg bg-brand-50 p-3 text-center">
            <div className="mx-auto mb-2 grid h-20 w-20 grid-cols-4 gap-0.5 rounded bg-white p-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className={`rounded-[1px] ${i % 3 ? "bg-neutral-900" : "bg-white"}`} />
              ))}
            </div>
            <p className="text-[10px] font-medium text-neutral-700">Scan to share your photos</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-neutral-100 bg-white py-14">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
          {[
            ["1. Scan", "Guests point their camera at the table QR — a lightweight web app opens instantly. No download, no registration."],
            ["2. Share", "Photos are compressed in the browser and fly straight to secure cloud storage — venue Wi-Fi stays fast."],
            ["3. Shine", "You approve with one tap and the photo fades onto the big screen in real time. Export everything the next day."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="mb-2 font-display text-xl font-bold text-brand-700">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checkout */}
      <section id="checkout" className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="mb-2 text-center font-display text-3xl font-bold">
          Create your event
        </h2>
        <p className="mb-8 text-center text-neutral-600">
          Set up takes two minutes. Pay once — no subscriptions.
        </p>
        <CheckoutForm />
      </section>

      <footer className="border-t border-neutral-100 py-8 text-center text-xs text-neutral-400">
        SnapEvent · Made with ❤️ for celebrations in Israel
      </footer>
    </main>
  );
}
