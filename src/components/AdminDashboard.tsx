"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useEventSocket } from "@/lib/useEventSocket";

interface AdminEvent {
  id: string;
  slug: string;
  name: string;
  googleConnected: boolean;
}

interface MediaItem {
  id: string;
  url: string;
  guestName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "IMAGE" | "VIDEO";
  createdAt: string;
}

type Tab = "moderation" | "assets" | "export";

export default function AdminDashboard({
  event,
  adminKey,
}: {
  event: AdminEvent;
  adminKey: string;
}) {
  const [tab, setTab] = useState<Tab>("moderation");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");
  const [guestsOnline, setGuestsOnline] = useState(0);
  const [newAlert, setNewAlert] = useState(0);
  const [syncState, setSyncState] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${event.slug}/media?key=${adminKey}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }, [event.slug, adminKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEventSocket(event.id, "admin", {
    "media:new": (m: MediaItem) => {
      setItems((prev) => [{ ...m }, ...prev.filter((x) => x.id !== m.id)]);
      setNewAlert((n) => n + 1);
    },
    "guests:count": ({ count }: { count: number }) => setGuestsOnline(count),
  });

  async function moderate(id: string, action: "APPROVE" | "REJECT") {
    // Optimistic — the card flips instantly, venue screen follows via WS.
    setItems((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: action === "APPROVE" ? "APPROVED" : "REJECTED" } : m
      )
    );
    const res = await fetch(`/api/media/${id}?key=${adminKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) load(); // roll back to server truth
  }

  async function googleSync() {
    setSyncState("Syncing to Google Drive…");
    const res = await fetch(`/api/events/${event.slug}/google/sync?key=${adminKey}`, {
      method: "POST",
    });
    const data = await res.json();
    setSyncState(
      res.ok
        ? `Done — ${data.uploaded} files uploaded. Open: ${data.folderUrl}`
        : `Sync failed: ${data.error}`
    );
  }

  const stats = useMemo(() => {
    const total = items.length;
    const approved = items.filter((m) => m.status === "APPROVED").length;
    const pending = items.filter((m) => m.status === "PENDING").length;
    return { total, approved, pending };
  }, [items]);

  const visible = filter === "PENDING" ? items.filter((m) => m.status === "PENDING") : items;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">SnapEvent Admin</p>
            <h1 className="font-display text-xl font-bold">{event.name}</h1>
          </div>
          {/* Stats strip */}
          <div className="flex gap-6 text-center text-sm">
            <Stat label="Uploaded" value={stats.total} />
            <Stat label="Approved" value={stats.approved} accent="text-green-600" />
            <Stat label="Pending" value={stats.pending} accent="text-amber-600" />
            <Stat label="Guests online" value={guestsOnline} accent="text-brand-600" />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-6">
          {(
            [
              ["moderation", "Moderation"],
              ["assets", "Assets"],
              ["export", "Export"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                tab === id
                  ? "border border-b-0 border-neutral-200 bg-neutral-50 text-brand-700"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {tab === "moderation" && (
          <>
            {/* Sticky real-time alert */}
            {newAlert > 0 && (
              <button
                onClick={() => {
                  setNewAlert(0);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="sticky top-28 z-10 mb-4 w-full animate-fade-in rounded-xl bg-brand-600 py-2 text-sm font-bold text-white shadow-lg"
              >
                ⚡ {newAlert} new photo{newAlert > 1 ? "s" : ""} just arrived — click to view
              </button>
            )}

            <div className="mb-4 flex gap-2">
              {(["PENDING", "ALL"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                    filter === f ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 shadow-sm"
                  }`}
                >
                  {f === "PENDING" ? `Awaiting review (${stats.pending})` : `Everything (${stats.total})`}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 p-16 text-center text-neutral-400">
                {filter === "PENDING"
                  ? "All caught up! New uploads will appear here instantly. ✨"
                  : "No media yet — get those QR codes on the tables!"}
              </div>
            ) : (
              /* Moderation matrix — masonry via CSS columns */
              <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
                {visible.map((m) => (
                  <MediaCard key={m.id} media={m} onModerate={moderate} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "assets" && (
          <div className="max-w-xl space-y-6">
            <h2 className="font-display text-2xl font-bold">Printable table signs</h2>
            <p className="text-sm text-neutral-600">
              Print one per table. Guests scan with their native camera — no app needed.
            </p>
            <img
              src={`/api/events/${event.slug}/qr?size=600`}
              alt="Event QR code"
              className="w-64 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            />
            <div className="flex flex-wrap gap-3">
              <a
                href={`/api/events/${event.slug}/qr?size=1200`}
                download={`snapevent-qr-${event.slug}.png`}
                className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Download QR (print-ready PNG)
              </a>
              <a
                href={`/events/${event.slug}/sign`}
                target="_blank"
                className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-bold text-neutral-800"
              >
                Open printable A5 sign →
              </a>
            </div>
            <div className="rounded-xl bg-white p-4 text-sm text-neutral-600 shadow-sm">
              <p className="font-bold text-neutral-800">Venue screen URL (give this to the DJ/AV):</p>
              <code className="mt-1 block break-all rounded bg-neutral-100 p-2 text-xs">
                {typeof window !== "undefined" ? window.location.origin : ""}/events/{event.slug}/slideshow
              </code>
            </div>
          </div>
        )}

        {tab === "export" && (
          <div className="max-w-xl space-y-6">
            <h2 className="font-display text-2xl font-bold">Take your memories home</h2>
            <div className="space-y-3">
              <a
                href={`/api/events/${event.slug}/export?key=${adminKey}`}
                className="block rounded-xl bg-neutral-900 px-5 py-3 text-center text-sm font-bold text-white"
              >
                ⬇️ Download ZIP — approved photos ({stats.approved})
              </a>
              <a
                href={`/api/events/${event.slug}/export?key=${adminKey}&status=ALL`}
                className="block rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-bold text-neutral-800"
              >
                Download ZIP — everything ({stats.total})
              </a>
              {event.googleConnected ? (
                <button
                  onClick={googleSync}
                  className="block w-full rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white"
                >
                  ☁️ Sync approved photos to Google Drive
                </button>
              ) : (
                <a
                  href={`/api/events/${event.slug}/google/auth?key=${adminKey}`}
                  className="block rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white"
                >
                  Connect Google Drive / Photos
                </a>
              )}
              {syncState && (
                <p className="break-all rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{syncState}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: number; accent?: string }) {
  return (
    <div>
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
    </div>
  );
}

function MediaCard({
  media,
  onModerate,
}: {
  media: MediaItem;
  onModerate: (id: string, action: "APPROVE" | "REJECT") => void;
}) {
  return (
    <div className="break-inside-avoid overflow-hidden rounded-xl bg-white shadow-sm">
      {media.type === "VIDEO" ? (
        <video src={media.url} controls playsInline className="w-full" />
      ) : (
        <img src={media.url} alt={`Photo by ${media.guestName}`} className="w-full" loading="lazy" />
      )}
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
          <span className="font-medium text-neutral-800">{media.guestName}</span>
          <span>{new Date(media.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {media.status === "PENDING" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onModerate(media.id, "APPROVE")}
              className="rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white transition active:scale-95"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onModerate(media.id, "REJECT")}
              className="rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition active:scale-95"
            >
              ✕ Reject
            </button>
          </div>
        ) : (
          <div
            className={`rounded-lg py-1.5 text-center text-xs font-bold ${
              media.status === "APPROVED" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {media.status === "APPROVED" ? "Approved — live on screen" : "Rejected"}
          </div>
        )}
      </div>
    </div>
  );
}
