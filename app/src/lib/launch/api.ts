import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireJsonRequest(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError('Content-Type must be application/json.', 415);
  }

  return null;
}

function getClientKey(request: NextRequest, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return `${scope}:${forwarded || realIp || 'unknown'}`;
}

export function enforceRateLimit(request: NextRequest, scope: string, maxRequests: number) {
  const now = Date.now();
  const key = getClientKey(request, scope);
  const recent = (RATE_LIMIT_BUCKETS.get(key) ?? []).filter((stamp) => now - stamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= maxRequests) {
    return jsonError('Too many requests. Try again shortly.', 429);
  }

  recent.push(now);
  RATE_LIMIT_BUCKETS.set(key, recent);
  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, stamps] of RATE_LIMIT_BUCKETS.entries()) {
    const recent = stamps.filter((stamp) => now - stamp < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      RATE_LIMIT_BUCKETS.delete(key);
    } else {
      RATE_LIMIT_BUCKETS.set(key, recent);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref?.();
