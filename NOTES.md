# Notes

## Phase 1 — Make it run

Bugs found by reading the poll / signal / WebRTC / presence path, then exercising two tabs.

- **Ghost dots.** `poll` refreshed `lastSeen` for every presence row, so abandoned dots stayed “online” as long as anyone was polling. Heartbeat now updates **the caller only**; stale rows still reap after 15s.
- **Chat never arrived.** Data-channel handler only accepted `t: "msg"`; the sender used `t: "chat"`. Accept both.
- **ICE before remote description.** Candidates were flushed in `onnegotiationneeded` before `setRemoteDescription`. Queue them until a remote description exists, then flush.
- **`end` left people busy.** Busy was set on `accept` but not cleared on `end`, so a finished call blocked new ones. `decline` / `end` now clear busy (later tightened in Phase 3 with pairing).
- **Tab close dropped the hang-up.** `leave` deleted outbound signals, so a pagehide `end` never reached the peer. Keep outbound mailbox rows; only delete inbound + presence.
- **Join re-rolled the offset.** Re-join after `alive: false` used upsert-update that could skip a fresh row; also `join` on an existing id must not pick a new 1–3 km offset mid-session. (Phase 3 then made join server-issued, so a true dead session becomes a new id.)
- **React render warning.** `myLocationRef.current = myLocation` ran during render. Moved into `useEffect`.

## Phase 2 — Make it good

No mockup — treat first paint and first meeting as the two moments that have to feel like Pulse.

- **Landing.** Rotating globe (`earth-globe.mp4` / `.jpg`) on a navy aurora. `mix-blend-mode: screen` on a clip whose backing was crushed to true black so the GIF/video’s square frame disappears; a CSS mask was the wrong fix (it sliced atmosphere). CTA cyan matches the globe limb. Reduced-motion swaps to a still.
- **Handshake.** Both sides of a first meeting share `MeetingArt` (`moonlit-pair.avif`, hue-shifted toward the app). Outgoing “Reaching out…” is a real card, not a tiny top pill. In-chat video prompt stays plain so yes/no stays fast.
- **Ship small assets.** Uncompressed GIF stays in gitignored `/assets`; only the encoded public files ship. Stop tracking `.neon`.

## Phase 3 — Make it secure

Ranked by “what can a stranger do with only a public map id.”

| Pri | Issue | What I did |
| --- | --- | --- |
| P0 | Public session UUID was enough to poll the mailbox (SDP/ICE → real IP), impersonate, busy-lock, or `leave` someone | Server issues id + bearer token; store **sha256(token)** only. Poll / signal / leave require it. |
| P0 | `fromId` was client-supplied | `fromId` is always the authenticated session |
| P0 | Anyone could `POST /api/join` with a known id (upsert / squat) | Join no longer accepts an id; new session every successful join |
| P1 | `accept` / SDP could target anyone | `pairedWith` on presence: request / accept / ICE / end only between a real pair |
| P1 | Token in `GET /api/poll?id=` leaks to logs / referrers | Poll is **POST** + `Authorization` (`sendBeacon` leave still sends `{ token }` because it cannot set headers) |
| P1 | Mailbox / join floods | Per-isolate rate limits; 64KB payload; 24-deep inbox |
| P2 | Clickjacking / extra browser surface | `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, Permissions-Policy, CSP that still allows Mapbox |

**Not fixed (trade-offs):**

- Rate limits are per serverless isolate, not a global quota.
- CSP still needs `'unsafe-inline'` / `'unsafe-eval'` for Next + Mapbox GL.
- Restrict the Mapbox token by URL in their dashboard (it is `NEXT_PUBLIC` by design).
- STUN still shows a peer IP to the other peer — that is WebRTC, not the coordination API.

## Phase 4 — Make it better

Not started yet.
