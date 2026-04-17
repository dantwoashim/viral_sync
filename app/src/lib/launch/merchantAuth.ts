import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { MerchantOperatorLoginResult, MerchantOperatorSession } from '@/lib/launch/types';

const MERCHANT_SESSION_COOKIE = 'vs-merchant-session';
const SESSION_TTL_MS = Number(process.env.VIRAL_SYNC_MERCHANT_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface MerchantSessionPayload {
  operatorId: string;
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  operatorLabel: string;
  role: NonNullable<MerchantOperatorSession['role']>;
  issuedAt: number;
  expiresAt: number;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function merchantSessionSecret() {
  if (process.env.VIRAL_SYNC_MERCHANT_SESSION_SECRET) {
    return process.env.VIRAL_SYNC_MERCHANT_SESSION_SECRET;
  }

  if (!IS_PRODUCTION) {
    return 'viral-sync-dev-merchant-session-secret';
  }

  return null;
}

function signPayload(payload: string) {
  const secret = merchantSessionSecret();
  if (!secret) {
    return null;
  }

  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function serializeSession(session: MerchantSessionPayload) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);
  if (!signature) {
    return null;
  }

  return `${payload}.${signature}`;
}

function parseSessionToken(token: string): MerchantSessionPayload | null {
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
    const parsed = JSON.parse(base64UrlDecode(payload)) as MerchantSessionPayload;
    if (!parsed.operatorId || !parsed.merchantId || !parsed.merchantSlug || !parsed.operatorLabel || !parsed.role || !parsed.expiresAt) {
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isMerchantSessionConfigured() {
  return Boolean(merchantSessionSecret());
}

export function createMerchantSession(identity: {
  operatorId: string;
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  operatorLabel: string;
  role: NonNullable<MerchantOperatorSession['role']>;
}): MerchantOperatorLoginResult {
  const issuedAt = Date.now();
  return {
    authenticated: true,
    operatorId: identity.operatorId,
    merchantId: identity.merchantId,
    merchantSlug: identity.merchantSlug,
    merchantName: identity.merchantName,
    operatorLabel: identity.operatorLabel,
    role: identity.role,
    expiresAt: issuedAt + SESSION_TTL_MS,
  };
}

export function attachMerchantSession(response: NextResponse, session: MerchantOperatorLoginResult) {
  const serialized = serializeSession({
    operatorId: session.operatorId,
    merchantId: session.merchantId,
    merchantSlug: session.merchantSlug,
    merchantName: session.merchantName,
    operatorLabel: session.operatorLabel,
    role: session.role,
    issuedAt: Date.now(),
    expiresAt: session.expiresAt,
  });

  if (!serialized) {
    return false;
  }

  response.cookies.set({
    name: MERCHANT_SESSION_COOKIE,
    value: serialized,
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return true;
}

export function clearMerchantSession(response: NextResponse) {
  response.cookies.set({
    name: MERCHANT_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
    expires: new Date(0),
  });
}

export function getMerchantSession(request: NextRequest): MerchantOperatorSession {
  const token = request.cookies.get(MERCHANT_SESSION_COOKIE)?.value;
  if (!token) {
    return { authenticated: false };
  }

  const parsed = parseSessionToken(token);
  if (!parsed) {
    return { authenticated: false };
  }

  return {
    authenticated: true,
    operatorId: parsed.operatorId,
    merchantId: parsed.merchantId,
    merchantSlug: parsed.merchantSlug,
    merchantName: parsed.merchantName,
    operatorLabel: parsed.operatorLabel,
    role: parsed.role,
    expiresAt: parsed.expiresAt,
  };
}
