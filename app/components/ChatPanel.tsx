"use client";

import { useEffect, useRef, useState } from "react";
import type { PulseStrength } from "@/lib/webrtc";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  messages,
  connected,
  videoBusy,
  onSend,
  onSendPulse,
  onStartVideo,
  onEnd,
}: {
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onSendPulse: (strength: PulseStrength) => void;
  onStartVideo: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [charging, setCharging] = useState(false);
  const [charge, setCharge] = useState<PulseStrength>(1);
  const endRef = useRef<HTMLDivElement>(null);
  const holdStartedAt = useRef(0);
  const chargingRef = useRef(false);
  const chargeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  function startPulse() {
    if (!connected || chargingRef.current) return;
    holdStartedAt.current = performance.now();
    chargingRef.current = true;
    setCharge(1);
    setCharging(true);
    chargeTimer.current = setInterval(() => {
      const heldFor = performance.now() - holdStartedAt.current;
      setCharge(heldFor >= 1_200 ? 3 : heldFor >= 500 ? 2 : 1);
    }, 100);
  }

  function releasePulse() {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    if (chargeTimer.current) clearInterval(chargeTimer.current);
    chargeTimer.current = null;
    const heldFor = performance.now() - holdStartedAt.current;
    const strength: PulseStrength = heldFor >= 1_200 ? 3 : heldFor >= 500 ? 2 : 1;
    setCharging(false);
    setCharge(1);
    onSendPulse(strength);
  }

  useEffect(
    () => () => {
      if (chargeTimer.current) clearInterval(chargeTimer.current);
    },
    [],
  );

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <p className="font-semibold">Stranger</p>
          <p className="text-xs text-zinc-500">
            {connected ? "Connected" : "Connecting…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500 disabled:opacity-40"
          >
            Video
          </button>
          <button
            onClick={onEnd}
            className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-400"
          >
            End
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Say hello, or send a pulse before you find the words.
            </p>
            <p className="mt-1 text-xs text-zinc-700">
              Everything here is peer-to-peer and never stored.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words ${
                m.mine
                  ? "bg-emerald-400 text-zinc-950"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-zinc-800/80 px-3 pt-3">
        <button
          type="button"
          className={`pulse-button pulse-button--level-${charge} ${
            charging ? "pulse-button--charging" : ""
          }`}
          disabled={!connected}
          aria-label="Hold to send a pulse"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            startPulse();
          }}
          onPointerUp={releasePulse}
          onPointerCancel={releasePulse}
          onKeyDown={(event) => {
            if ((event.key === " " || event.key === "Enter") && !event.repeat) {
              event.preventDefault();
              startPulse();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              releasePulse();
            }
          }}
        >
          <span className="pulse-button-heart">♥</span>
          <span>{charging ? "Let go to send" : "Hold to send a pulse"}</span>
          <span className="pulse-button-meter" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-zinc-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-sm outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
