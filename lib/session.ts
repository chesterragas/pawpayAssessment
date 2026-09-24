import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken, isSessionId } from "@/lib/token";

export type Session = { id: string };

function readBearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length >= 16 && token.length <= 128 ? token : null;
}

export function readBodyToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const token = (body as { token?: unknown }).token;
  if (typeof token !== "string") return null;
  return token.length >= 16 && token.length <= 128 ? token : null;
}

export async function sessionFromToken(
  token: string | null,
): Promise<Session | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = await prisma.presence.findFirst({
    where: { tokenHash },
    select: { id: true },
  });
  if (!row || !isSessionId(row.id)) return null;
  return { id: row.id };
}

export async function requireSession(
  request: NextRequest,
  bodyToken?: string | null,
): Promise<Session | Response> {
  const token = readBearer(request) ?? bodyToken ?? null;
  const session = await sessionFromToken(token);
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return session;
}

export function isSession(value: Session | Response): value is Session {
  return !(value instanceof Response);
}
