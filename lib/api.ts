// Client-side helpers for talking to the coordination API.
import type { PollResponse, SignalType } from "@/lib/types";

let session: { id: string; token: string } | null = null;

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }
  return headers;
}

export function sessionId(): string | null {
  return session?.id ?? null;
}

export async function join(lat: number, lng: number): Promise<string> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) throw new Error(`join failed: ${res.status}`);
  const data = (await res.json()) as { id: string; token: string };
  if (!data.id || !data.token) throw new Error("join failed: missing session");
  session = { id: data.id, token: data.token };
  return data.id;
}

export async function poll(): Promise<PollResponse> {
  const res = await fetch("/api/poll", {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

export async function sendSignal(
  toId: string,
  type: SignalType,
  payload?: string,
): Promise<void> {
  await fetch("/api/signal", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ toId, type, payload }),
    keepalive: true,
  });
}

// Fire-and-forget leave that survives the tab closing.
export function leave(): void {
  const body = JSON.stringify({ token: session?.token });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/leave", body);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: authHeaders(),
      body,
      keepalive: true,
    });
  }
  session = null;
}
