"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, MAX_VIDEO_BYTES } from "@/lib/compressImage";
import { useEventSocket } from "@/lib/useEventSocket";
import { LangToggle, useLang } from "@/lib/i18n";

interface GuestEvent {
  id: string;
  slug: string;
  name: string;
  type: string;
  theme: string;
  allowVideo: boolean;
}

type UploadState = "compressing" | "uploading" | "done" | "error";
interface UploadItem {
  id: string;
  name: string;
  state: UploadState;
  error?: string;
}

const THEME_BG: Record<string, string> = {
  classic: "from-brand-50 to-white",
  romance: "from-pink-100 to-rose-50",
  night: "from-slate-900 to-slate-800",
  festive: "from-amber-50 to-orange-50",
};

export default function GuestApp({ event }: { event: GuestEvent }) {
  const { t } = useLang();
  const [guestName, setGuestName] = useState("");
  const [entered, setEntered] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const dark = event.theme === "night";

  // Restore the name so returning guests skip the gate.
  useEffect(() => {
    const saved = localStorage.getItem(`snapevent:name:${event.slug}`);
    if (saved) {
      setGuestName(saved);
      setEntered(true);
    }
  }, [event.slug]);

  // Presence: counted as an active guest on the admin stats strip.
  useEventSocket(entered ? event.id : null, "guest", {});

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    localStorage.setItem(`snapevent:name:${event.slug}`, name);
    setEntered(true);
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const isVideo = file.type.startsWith("video/");
      setUploads((u) => [{ id, name: file.name, state: "compressing" }, ...u]);
      uploadOne(id, file, isVideo).catch((err) =>
        setUploads((u) =>
          u.map((it) => (it.id === id ? { ...it, state: "error", error: String(err.message ?? err) } : it))
        )
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  async function uploadOne(id: string, file: File, isVideo: boolean) {
    let blob: Blob = file;
    let contentType = file.type || "application/octet-stream";
    let ext = file.name.split(".").pop()?.toLowerCase() || "bin";

    if (isVideo) {
      if (!event.allowVideo) throw new Error(t("guest.errVideoPremium"));
      if (file.size > MAX_VIDEO_BYTES) throw new Error(t("guest.errVideoSize"));
    } else {
      // Client-side processing: downscale to 1200px, re-encode to WebP (~500KB).
      const compressed = await compressImage(file);
      blob = compressed.blob;
      contentType = compressed.contentType;
      ext = compressed.ext;
    }

    setUploads((u) => u.map((it) => (it.id === id ? { ...it, state: "uploading" } : it)));

    // 1. Get a presigned direct-to-storage URL (server never sees the bytes).
    const presignRes = await fetch(`/api/events/${event.slug}/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, ext }),
    });
    const presign = await presignRes.json();
    if (!presignRes.ok) throw new Error(presign.error ?? t("guest.errUpload"));

    // 2. Upload straight to R2 (or the local dev endpoint).
    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!putRes.ok) throw new Error(t("guest.errUpload"));

    // 3. Confirm — creates the PENDING media record + real-time admin alert.
    const confirmRes = await fetch(`/api/events/${event.slug}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storageKey: presign.storageKey,
        guestName,
        type: isVideo ? "VIDEO" : "IMAGE",
        sizeBytes: blob.size,
      }),
    });
    if (!confirmRes.ok) throw new Error(t("guest.errSave"));

    setUploads((u) => u.map((it) => (it.id === id ? { ...it, state: "done" } : it)));
  }

  const bg = THEME_BG[event.theme] ?? THEME_BG.classic;
  const text = dark ? "text-white" : "text-neutral-900";
  const subtext = dark ? "text-slate-300" : "text-neutral-500";

  return (
    <main className={`min-h-screen bg-gradient-to-b ${bg} ${text}`}>
      <div className="mx-auto max-w-md px-5 py-10">
        <div className="mb-4 flex justify-end">
          <LangToggle />
        </div>
        {/* Brandable banner */}
        <header className="mb-8 text-center">
          <p className={`text-xs uppercase tracking-widest ${subtext}`}>SnapEvent</p>
          <h1 className="mt-1 font-display text-3xl font-bold">{event.name}</h1>
          <p className={`mt-1 text-sm ${subtext}`}>{t("guest.tagline")}</p>
        </header>

        {!entered ? (
          <form onSubmit={enter} className="animate-slide-up space-y-4">
            <label className="block">
              <span className={`mb-1.5 block text-sm font-medium ${subtext}`}>{t("guest.yourName")}</span>
              <input
                autoFocus
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-lg text-neutral-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder={t("guest.namePlaceholder")}
                value={guestName}
                maxLength={60}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-600 py-3.5 text-lg font-bold text-white transition active:scale-[0.98]"
            >
              {t("guest.enter")}
            </button>
            <p className={`text-center text-xs ${subtext}`}>
              {t("guest.noSignup")}
            </p>
          </form>
        ) : (
          <div className="animate-slide-up space-y-6">
            <button
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-brand-600 py-8 text-white shadow-lg transition active:scale-[0.98]"
            >
              <span className="text-4xl">📷</span>
              <span className="text-xl font-bold">{t("guest.share")}</span>
              <span className="text-xs opacity-80">
                {event.allowVideo ? t("guest.pickPhotosVideos") : t("guest.pickPhotos")}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={event.allowVideo ? "image/*,video/*" : "image/*"}
              multiple
              hidden
              onChange={(e) => onFilesPicked(e.target.files)}
            />

            {uploads.length > 0 && (
              <ul className="space-y-2">
                {uploads.map((u) => (
                  <li
                    key={u.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                      dark ? "bg-slate-700/60" : "bg-white shadow-sm"
                    }`}
                  >
                    <span className="max-w-[60%] truncate">{u.name}</span>
                    <StatusBadge state={u.state} error={u.error} />
                  </li>
                ))}
              </ul>
            )}

            <p className={`text-center text-xs ${subtext}`}>
              {t("guest.pendingNote")}
            </p>
            <p className={`text-center text-xs ${subtext}`}>
              {t("guest.connectedAs")} <b>{guestName}</b> ·{" "}
              <button
                className="underline"
                onClick={() => {
                  localStorage.removeItem(`snapevent:name:${event.slug}`);
                  setEntered(false);
                }}
              >
                {t("guest.changeName")}
              </button>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ state, error }: { state: UploadState; error?: string }) {
  const { t } = useLang();
  switch (state) {
    case "compressing":
      return <span className="text-amber-500">{t("guest.compressing")}</span>;
    case "uploading":
      return <span className="text-blue-500">{t("guest.uploading")}</span>;
    case "done":
      return <span className="font-bold text-green-600">{t("guest.done")}</span>;
    case "error":
      return <span className="text-red-500">{error ?? t("guest.error")}</span>;
  }
}
