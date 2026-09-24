"use client";

import type { PulseStrength } from "@/lib/webrtc";

export interface PulseEvent {
  id: number;
  mine: boolean;
  strength: PulseStrength;
}

export default function PulseWave({ event }: { event: PulseEvent }) {
  return (
    <div
      className={`shared-pulse shared-pulse--strength-${event.strength} ${
        event.mine ? "shared-pulse--mine" : "shared-pulse--theirs"
      }`}
      aria-live="polite"
    >
      <span className="shared-pulse-ring shared-pulse-ring--one" />
      <span className="shared-pulse-ring shared-pulse-ring--two" />
      <span className="shared-pulse-ring shared-pulse-ring--three" />
      <span className="shared-pulse-core">♥</span>
      <span className="shared-pulse-label">
        {event.mine ? "Pulse sent" : "A stranger sent you a pulse"}
      </span>
    </div>
  );
}
