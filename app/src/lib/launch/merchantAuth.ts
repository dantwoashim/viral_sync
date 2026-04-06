import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import type { MerchantOperatorLoginResult, MerchantOperatorSession } from '@/lib/launch/types';

const MERCHANT_SESSION_COOKIE = 'vs-merchant-session';
const DEFAULT_MERCHANT_ID = process.env.VIRAL_SYNC_MERCHANT_ID || 'merchant-nyano-chiya-ghar';
const DEFAULT_MERCHANT_NAME = process.env.VIRAL_SYNC_MERCHANT_NAME || 'Nyano Chiya Ghar';
const SESSION_TTL_MS = Number(process.env.VIRAL_SYNC_MERCHANT_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface MerchantSessionPayload {
  merchantId: string;
  merchantName: string;
  operatorLabel: string;
  issuedAt: number;
  expiresAt: number;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function merchantAccessCode() {
  if (process.env.VIRAL_SYNC_MERCHANT_ACCESS_CODE) {
    return process.env.VIRAL_SYNC_MERCHANT_ACCESS_CODE;
  }

  if (!IS_PRODUCTION) {
    return 'pilot-counter';
  }

  return null;
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
    if (!parsed.merchantId || !parsed.operatorLabel || !parsed.expiresAt) {
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
  return Boolean(merchantAccessCode() && merchantSessionSecret());
}

export function verifyMerchantAccessCode(candidate: string) {
  const configured = merchantAccessCode();
  if (!configured) {
    return false;
  }

  const left = Buffer.from(candidate.trim(), 'utf8');
  const right = Buffer.from(configured, 'utf8');
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function createMerchantSession(operatorLabel: string): MerchantOperatorLoginResult | null {
  const trimmed = operatorLabel.trim();
  if (!trimmed) {
    return null;
  }

  const issuedAt = Date.now();
  return {
    authenticated: true,
    merchantId: DEFAULT_MERCHANT_ID,
    merchantName: DEFAULT_MERCHANT_NAME,
    operatorLabel: trimmed,
    expiresAt: issuedAt + SESSION_TTL_MS,
  };
}

export function attachMerchantSession(response: NextResponse, session: MerchantOperatorLoginResult) {
  const serialized = serializeSession({
    merchantId: session.merchantId,
    merchantName: session.merchantName,
    operatorLabel: session.operatorLabel,
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
    merchantId: parsed.merchantId,
    merchantName: parsed.merchantName,
    operatorLabel: parsed.operatorLabel,
    expiresAt: parsed.expiresAt,
  };
}
