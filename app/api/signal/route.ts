import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import { forbiddenOrigin, isAllowedOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";
import { isSession, requireSession } from "@/lib/session";
import { isSessionId } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024;
const MAX_INBOX = 24;

// POST /api/signal — Authorization: Bearer <token>
// body { toId, type, payload? }. fromId is the authenticated session, never
// the client-supplied field.
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin();

  const session = await requireSession(request);
  if (!isSession(session)) return session;

  if (!rateLimit(`signal:${session.id}`, 40, 60_000)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { toId, type, payload } = (body ?? {}) as Record<string, unknown>;

  if (!isSessionId(toId) || toId === session.id) {
    return Response.json({ error: "invalid ids" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    payload !== undefined &&
    payload !== null &&
    (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const signalType = type as SignalType;
  const payloadStr = typeof payload === "string" ? payload : null;
  const fromId = session.id;

  if (
    (signalType === "offer" ||
      signalType === "answer" ||
      signalType === "ice") &&
    !isJsonObject(payloadStr)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const pending = await prisma.signal.count({ where: { toId } });
  if (pending >= MAX_INBOX) {
    return Response.json({ error: "mailbox full" }, { status: 429 });
  }

  const [me, target] = await Promise.all([
    prisma.presence.findUnique({
      where: { id: fromId },
      select: { id: true, busy: true, pairedWith: true },
    }),
    prisma.presence.findUnique({
      where: { id: toId },
      select: { id: true, busy: true, pairedWith: true },
    }),
  ]);

  if (!me) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (signalType === "request") {
    if (!target || target.busy || target.pairedWith || me.pairedWith || me.busy) {
      await sendDecline(toId, fromId);
      return Response.json({ ok: true, autoDeclined: true });
    }

    await prisma.presence.update({
      where: { id: fromId },
      data: { pairedWith: toId },
    });
  } else if (signalType === "accept") {
    if (!target || target.pairedWith !== fromId) {
      return Response.json({ error: "not paired" }, { status: 409 });
    }
    await prisma.presence.updateMany({
      where: { id: { in: [fromId, toId] } },
      data: { busy: true },
    });
    await prisma.presence.update({
      where: { id: fromId },
      data: { pairedWith: toId },
    });
  } else if (signalType === "decline" || signalType === "end") {
    if (!isInvolved(me.pairedWith, target?.pairedWith, fromId, toId)) {
      return Response.json({ error: "not paired" }, { status: 409 });
    }
    await clearPair(fromId, toId);
  } else if (
    signalType === "offer" ||
    signalType === "answer" ||
    signalType === "ice"
  ) {
    if (
      !target ||
      !me.busy ||
      !target.busy ||
      me.pairedWith !== toId ||
      target.pairedWith !== fromId
    ) {
      return Response.json({ error: "not paired" }, { status: 409 });
    }
  }

  await prisma.signal.create({
    data: { fromId, toId, type: signalType, payload: payloadStr },
  });

  return Response.json({ ok: true });
}

function isJsonObject(payload: string | null): boolean {
  if (!payload) return false;
  try {
    const value = JSON.parse(payload) as unknown;
    return typeof value === "object" && value !== null;
  } catch {
    return false;
  }
}

function isInvolved(
  myPair: string | null | undefined,
  theirPair: string | null | undefined,
  fromId: string,
  toId: string,
): boolean {
  return myPair === toId || theirPair === fromId;
}

async function clearPair(a: string, b: string) {
  await prisma.presence.updateMany({
    where: { id: a, pairedWith: b },
    data: { busy: false, pairedWith: null },
  });
  await prisma.presence.updateMany({
    where: { id: b, pairedWith: a },
    data: { busy: false, pairedWith: null },
  });
}

async function sendDecline(targetId: string, initiatorId: string) {
  await prisma.signal.create({
    data: {
      fromId: targetId,
      toId: initiatorId,
      type: "decline",
      payload: null,
    },
  });
}
