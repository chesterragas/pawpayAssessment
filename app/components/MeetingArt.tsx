"use client";

// Decorative header for the connection handshake — two strangers reaching for
// each other. Shared by both halves of the handshake (the request being sent
// and the request being received) so the moment reads the same on both screens.
export default function MeetingArt({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <span className="meet-art" aria-hidden>
      <span className="meet-art-image" />
      {pulsing && <span className="meet-art-signal" />}
    </span>
  );
}
