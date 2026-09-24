"use client";

import MeetingArt from "./MeetingArt";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  art = false,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  // Only the first meeting between two strangers gets the illustration; the
  // in-chat video prompt stays plain so a quick yes/no isn't slowed down.
  art?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-zinc-900 text-center text-zinc-100 shadow-2xl ring-1 ring-white/10">
        {art && <MeetingArt />}
        <div className={art ? "px-6 pb-6 -mt-2" : "p-6"}>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500"
            >
              {declineLabel}
            </button>
            <button
              onClick={onAccept}
              className="flex-1 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              {acceptLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
