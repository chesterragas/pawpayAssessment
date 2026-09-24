import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { STALE_MS, SIGNAL_TTL_MS } from "@/lib/presence";
import type { PollResponse } from "@/lib/types";
import { forbiddenOrigin, isAllowedOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";
import { isSession, requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/poll — Authorization: Bearer <token>
// Heartbeats the caller, reaps stale rows, returns peers + this user's mailbox.
// POST (not GET) so the secret never lands in query strings, logs, or referrers.
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin();

  const session = await requireSession(request);
  if (!isSession(session)) return session;

  if (!rateLimit(`poll:${session.id}`, 90, 60_000)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  const now = Date.now();
  const staleCutoff = new Date(now - STALE_MS);
  const signalCutoff = new Date(now - SIGNAL_TTL_MS);

  const heartbeat = await prisma.presence.updateMany({
    where: { id: session.id },
    data: { lastSeen: new Date(now) },
  });

  await prisma.presence.deleteMany({ where: { lastSeen: { lt: staleCutoff } } });
  await prisma.signal.deleteMany({ where: { createdAt: { lt: signalCutoff } } });

  const peers = await prisma.presence.findMany({
    where: {
      id: { not: session.id },
      lastSeen: { gte: staleCutoff },
    },
    select: { id: true, lat: true, lng: true, busy: true },
  });

  const inbox = await prisma.signal.findMany({
    where: { toId: session.id },
    orderBy: { createdAt: "asc" },
  });
  if (inbox.length > 0) {
    await prisma.signal.deleteMany({
      where: { id: { in: inbox.map((s) => s.id) } },
    });
  }

  const response: PollResponse = {
    alive: heartbeat.count > 0,
    peers: peers.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      busy: p.busy,
    })),
    signals: inbox.map((s) => ({
      id: s.id,
      fromId: s.fromId,
      toId: s.toId,
      type: s.type as PollResponse["signals"][number]["type"],
      payload: s.payload,
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return Response.json(response);
}
