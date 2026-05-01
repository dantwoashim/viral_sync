import { NextRequest, NextResponse } from 'next/server';
import type { MerchantRole } from '@/lib/launch/types';
import { requireMerchantRole } from '@/lib/launch/server';

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_JSON_BODY_BYTES = 32_000;
const RATE_LIMIT_BUCKETS = new Map<string, number[]>();

export function jsonError(message: string, status: number, code = 'request_error', reqId?: string, details?: Record<string, unknown>) {
  return withSecurityHeaders(NextResponse.json({
    ok: false,
    error: {
      code,
      message,
      details,
      requestId: reqId,
    },
  }, { status }));
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
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return jsonError('JSON body is too large.', 413, 'body_too_large', requestId(request), { maxBytes: MAX_JSON_BODY_BYTES });
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
  response.headers.set('Cache-Control', response.headers.get('Cache-Control') ?? 'no-store');
  return response;
}

export function requireLaunchOpen(request: NextRequest) {
  if (process.env.LAUNCH_PAUSED !== 'true') {
    return null;
  }

  return jsonError('Viral Sync launch mutations are paused. Try again after the incident window clears.', 503, 'launch_paused', requestId(request));
}

export async function requireMerchantRequestRole(request: NextRequest, allowedRoles: MerchantRole[]) {
  const sessionId = merchantSessionFromRequest(request);
  if (!sessionId) {
    return {
      ok: false as const,
      response: jsonError('Merchant session is required.', 401, 'merchant_session_required', requestId(request)),
    };
  }

  const auth = await requireMerchantRole(sessionId, allowedRoles, requestId(request));
  if (!auth.ok) {
    return {
      ok: false as const,
      response: jsonError(auth.reason, 403, 'merchant_role_denied', requestId(request)),
    };
  }

  return { ok: true as const, session: auth.session };
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
    const response = jsonError('Too many requests. Try again shortly.', 429, 'rate_limited', requestId(request), { scope });
    response.headers.set('Retry-After', '60');
    return response;
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
