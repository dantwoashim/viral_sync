import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { ConsumerLoginMethod, ConsumerSession } from '@/lib/launch/types';

const CONSUMER_SESSION_COOKIE = 'vs-consumer-session';
const SESSION_TTL_MS = Number(process.env.VIRAL_SYNC_CONSUMER_SESSION_TTL_MS || 30 * 24 * 60 * 60 * 1000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface ConsumerSessionPayload {
  sessionId: string;
  displayName: string;
  loginMethod: ConsumerLoginMethod;
  role: 'consumer';
  issuedAt: number;
  expiresAt: number;
}

function consumerSessionSecret() {
  if (process.env.VIRAL_SYNC_CONSUMER_SESSION_SECRET) {
    return process.env.VIRAL_SYNC_CONSUMER_SESSION_SECRET;
  }

  if (!IS_PRODUCTION) {
    return 'viral-sync-dev-consumer-session-secret';
  }

  return null;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signPayload(payload: string) {
  const secret = consumerSessionSecret();
  if (!secret) {
    return null;
  }

  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function buildGuestDisplayName() {
  const seed = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `Guest ${seed.slice(0, 3)}`;
}

function serializeSession(session: ConsumerSessionPayload) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);
  if (!signature) {
    return null;
  }

  return `${payload}.${signature}`;
}

function parseSessionToken(token: string): ConsumerSessionPayload | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  if (!expected) {
    return null;
  }

  const receivedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as ConsumerSessionPayload;
    if (!parsed.sessionId || !parsed.displayName || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isConsumerSessionConfigured() {
  return Boolean(consumerSessionSecret());
}

export function createGuestConsumerSession(): ConsumerSession {
  const issuedAt = Date.now();
  return {
    authenticated: true,
    sessionId: `vs-${issuedAt.toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
    displayName: buildGuestDisplayName(),
    loginMethod: 'guest',
    role: 'consumer',
    expiresAt: issuedAt + SESSION_TTL_MS,
  };
}

export function getConsumerSession(request: NextRequest): ConsumerSession | null {
  const token = request.cookies.get(CONSUMER_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const parsed = parseSessionToken(token);
  if (!parsed) {
    return null;
  }

  return {
    authenticated: true,
    sessionId: parsed.sessionId,
    displayName: parsed.displayName,
    loginMethod: parsed.loginMethod,
    role: parsed.role,
    expiresAt: parsed.expiresAt,
  };
}

export function getOrCreateConsumerSession(request: NextRequest) {
  return getConsumerSession(request) ?? createGuestConsumerSession();
}

export function attachConsumerSession(response: NextResponse, session: ConsumerSession) {
  if (!session.authenticated || !session.sessionId || !session.displayName || !session.expiresAt) {
    return false;
  }

  const serialized = serializeSession({
    sessionId: session.sessionId,
    displayName: session.displayName,
    loginMethod: session.loginMethod ?? 'guest',
    role: 'consumer',
    issuedAt: Date.now(),
    expiresAt: session.expiresAt,
  });

  if (!serialized) {
    return false;
  }

  response.cookies.set({
    name: CONSUMER_SESSION_COOKIE,
    value: serialized,
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return true;
}

export function updateConsumerSession(
  current: ConsumerSession,
  updates: {
    displayName: string;
    loginMethod: ConsumerLoginMethod;
  },
): ConsumerSession | null {
  if (!current.authenticated || !current.sessionId) {
    return null;
  }

  const displayName = updates.displayName.trim() || current.displayName || buildGuestDisplayName();
  return {
    authenticated: true,
    sessionId: current.sessionId,
    displayName,
    loginMethod: updates.loginMethod ?? current.loginMethod ?? 'guest',
    role: 'consumer',
    expiresAt: current.expiresAt ?? Date.now() + SESSION_TTL_MS,
  };
}
