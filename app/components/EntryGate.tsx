"use client";

import { useState } from "react";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void Promise.resolve(
          onReady(pos.coords.latitude, pos.coords.longitude),
        ).catch(() => {
          setStatus("error");
          setError("Couldn't join Pulse. Please try again.");
        });
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  const locating = status === "locating";

  return (
    <div className="entry-shell relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden p-6 text-zinc-100">
      <div className="entry-aurora" aria-hidden />

      <div className="relative flex flex-col items-center">
        <p className="entry-eyebrow">Live now · worldwide</p>

        <div className="entry-globe" aria-hidden>
          <span className="entry-glow" />
          <span className="entry-ring" />
          <span className="entry-ring entry-ring--late" />
          {/* The clip wrapper carries the blend + circular crop: Chromium
              ignores a mask applied directly to a composited video layer. */}
          <span className="entry-globe-clip">
            <video
              className="entry-globe-media"
              src="/earth-globe.mp4"
              poster="/earth-globe.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            {/* Shown instead of the video when the user prefers reduced motion. */}
            <span className="entry-globe-media entry-globe-still" />
          </span>
        </div>

        <div className="-mt-2 text-center sm:-mt-3">
          <h1 className="entry-title">Pulse</h1>
          <p className="mx-auto mt-2 max-w-sm text-balance text-sm text-zinc-400 sm:text-base">
            A living globe of anonymous strangers. Drop onto the map and
            connect.
          </p>
        </div>

        <button
          onClick={enter}
          disabled={locating}
          className="entry-cta mt-6"
          aria-busy={locating}
        >
          {locating && <span className="entry-cta-spinner" aria-hidden />}
          {locating ? "Finding you…" : "Enter Pulse"}
        </button>

        <p
          className="mt-3 max-w-xs text-center text-sm text-rose-300 empty:hidden"
          role="status"
          aria-live="polite"
        >
          {status === "error" ? error : ""}
        </p>
      </div>

      <p className="relative mt-8 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
    </div>
  );
}
