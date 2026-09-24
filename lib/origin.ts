import type { NextRequest } from "next/server";

// Browser cross-site POSTs include Origin. Allow missing Origin (sendBeacon
// on some browsers, curl) but reject a mismatch so a random site can't drive
// the API with a stolen token via a simple form post.
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host.split(",")[0]!.trim();
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): Response {
  return Response.json({ error: "forbidden" }, { status: 403 });
}
