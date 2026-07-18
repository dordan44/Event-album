"use client";

import { useEffect, useRef, useState } from "react";
import { useEventSocket } from "@/lib/useEventSocket";

interface Slide {
  id: string;
  url: string;
  guestName: string;
  type: "IMAGE" | "VIDEO";
}

const ROTATE_MS = 7000;

/**
 * Venue screen view: pitch-black, zero chrome. New approvals jump the queue
 * so a guest sees their photo on the big screen seconds after approval.
 */
export default function Slideshow({ eventId, slug }: { eventId: string; slug: string }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const queue = useRef<Slide[]>([]); // fresh approvals waiting to be shown next

  // Bootstrap with everything already approved.
  useEffect(() => {
    fetch(`/api/events/${slug}/media?status=APPROVED`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then(({ items }) => setSlides(items))
      .catch(() => {});
  }, [slug]);

  useEventSocket(eventId, "slideshow", {
    "media:approved": (m: Slide) => {
      queue.current.push(m);
      setSlides((prev) => (prev.some((s) => s.id === m.id) ? prev : [...prev, m]));
    },
    "media:rejected": (m: Slide) => {
      // Host can un-approve by rejecting — pull it off the screen rotation.
      setSlides((prev) => prev.filter((s) => s.id !== m.id));
      queue.current = queue.current.filter((s) => s.id !== m.id);
    },
  });

  // Rotation timer: fresh approvals take priority, otherwise loop the deck.
  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => {
      const fresh = queue.current.shift();
      setSlides((current) => {
        const at = fresh ? current.findIndex((s) => s.id === fresh.id) : -1;
        setIndex((i) => (at >= 0 ? at : (i + 1) % current.length));
        return current;
      });
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <main className="fixed inset-0 cursor-none overflow-hidden bg-black">
      {slides.map((s, i) => (
        <SlideView key={s.id} slide={s} active={i === index} />
      ))}

      {slides.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-600">
          <p dir="rtl" className="text-2xl">ממתינים לתמונה המאושרת הראשונה…</p>
          <p className="text-lg text-neutral-700">Waiting for the first approved photo…</p>
        </div>
      )}

      {/* Lower-third overlay: nudge guests to scan */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/events/${slug}/qr?size=120`}
          alt="QR"
          className="h-14 w-14 rounded-lg bg-white p-1"
        />
        <div>
          <p dir="rtl" className="text-sm font-medium text-white/80">
            סרקו את הברקוד שעל השולחן — והתמונה שלכם תעלה לכאן! 📸
          </p>
          <p className="text-xs text-white/50">
            Scan the QR on your table to see your photo up here!
          </p>
        </div>
      </div>
    </main>
  );
}

function SlideView({ slide, active }: { slide: Slide; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (slide.type === "VIDEO" && videoRef.current) {
      if (active) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [active, slide.type]);

  if (slide.type === "VIDEO") {
    return (
      <video
        ref={videoRef}
        src={slide.url}
        muted
        loop
        playsInline
        className={`slideshow-img ${active ? "active" : ""}`}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={slide.url} alt="" className={`slideshow-img ${active ? "active" : ""}`} />;
}
