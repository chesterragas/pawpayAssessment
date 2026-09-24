import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { forbiddenOrigin, isAllowedOrigin } from "@/lib/origin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { hashToken, newSessionId, newSessionToken } from "@/lib/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/join — body { lat, lng } (raw coords).
// Issues a public session id + bearer token. Applies a 1–3 km privacy offset
// and inserts the presence row. Raw coordinates are never stored.
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) return forbiddenOrigin();

  if (!rateLimit(`join:${clientIp(request)}`, 8, 60_000)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { lat, lng } = (body ?? {}) as Record<string, unknown>;

  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const offset = applyPrivacyOffset(lat as number, lng as number);
  const id = newSessionId();
  const token = newSessionToken();

  await prisma.presence.create({
    data: {
      id,
      tokenHash: hashToken(token),
      lat: offset.lat,
      lng: offset.lng,
      busy: false,
      lastSeen: new Date(),
    },
  });

  return Response.json({ id, token });
}
