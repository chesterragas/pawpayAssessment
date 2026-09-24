import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbiddenOrigin, isAllowedOrigin } from "@/lib/origin";
import { isSession, readBodyToken, requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave — Bearer token, or { token } in the body for sendBeacon
// (which cannot set Authorization). Removes this session's presence row and
// inbound mailbox. Outbound signals stay so a tab-close `end` can still land.
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin();

  let body: unknown = null;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  const session = await requireSession(request, readBodyToken(body));
  if (!isSession(session)) return session;

  await prisma.signal.deleteMany({
    where: { toId: session.id },
  });
  await prisma.presence.deleteMany({ where: { id: session.id } });

  return Response.json({ ok: true });
}
