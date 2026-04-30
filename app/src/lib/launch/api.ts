import { NextRequest, NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();

export function jsonError(message: string, status: number, code = 'request_error', reqId?: string, details?: Record<string, unknown>) {
  return NextResponse.json({
    ok: false,
    error: {
      code,
      message,
      details,
      requestId: reqId,
    },
  }, { status });
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
    return jsonError('Content-Type must be application/json.', 415, 'invalid_content_type', requestId(request));
  }

  return null;
}

export function requestId(request: NextRequest) {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const allowedOrigins = (process.env.LAUNCH_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!origin || !host) {
    return null;
  }

  const currentOrigin = `${request.nextUrl.protocol}//${host}`;
  if (origin === currentOrigin || allowedOrigins.includes(origin)) {
    return null;
  }

  return jsonError('Origin is not allowed for this mutation.', 403, 'csrf_origin_denied', requestId(request), { origin });
}

export function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
  return response;
}

export function idempotencyKey(request: NextRequest, fallbackScope: string) {
  return request.headers.get('idempotency-key') || `${fallbackScope}:${requestId(request)}`;
}

export function staffPinFromRequest(request: NextRequest, body?: unknown) {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return typeof record.staffPin === 'string'
    ? record.staffPin
    : request.headers.get('x-viral-sync-staff-pin') ?? '';
}

export function merchantSessionFromRequest(request: NextRequest) {
  return request.cookies.get('vs_merchant_session')?.value
    ?? request.headers.get('x-viral-sync-merchant-session')
    ?? '';
}

export function staffDeviceFromRequest(request: NextRequest) {
  return request.headers.get('x-viral-sync-staff-device') ?? '';
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
    return jsonError('Too many requests. Try again shortly.', 429, 'rate_limited', requestId(request), { scope });
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
