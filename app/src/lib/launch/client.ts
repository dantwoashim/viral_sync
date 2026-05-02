'use client';

import type {
  ClaimResult,
  ConsumerSummary,
  MerchantConfirmResult,
  MerchantSummary,
  RedeemCodeResult,
  ReferralCreateResult,
  ReferralDetail,
} from '@/lib/launch/types';

async function parseJson<T>(response: Response) {
  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.reason === 'string'
        ? payload.reason
        : 'Request failed.';
    throw new Error(message);
  }

  return payload as T;
}

const STAFF_DEVICE_STORAGE_KEY = 'viral-sync-staff-device';

type StoredStaffDevice = {
  publicKey: string;
  secret: string;
};

function normalizeCodeForSignature(code: string) {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function staffDeviceHeaders(action: string, code?: string, staffPin?: string): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(STAFF_DEVICE_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  const device = JSON.parse(raw) as Partial<StoredStaffDevice>;
  if (!device.publicKey || !device.secret) {
    return {};
  }

  const nonceResponse = await fetch('/api/launch/staff-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'challenge',
      publicKey: device.publicKey,
      purpose: action,
      code,
      staffPin,
    }),
  });
  const noncePayload = await nonceResponse.json() as { ok?: boolean; nonce?: string };
  if (!nonceResponse.ok || !noncePayload.ok || !noncePayload.nonce) {
    return {};
  }

  const timestamp = Date.now().toString();
  const message = [
    'viral-sync-staff-device-v1',
    device.publicKey,
    timestamp,
    action,
    code ? normalizeCodeForSignature(code) : '',
    noncePayload.nonce,
  ].join(':');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(device.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));

  return {
    'x-viral-sync-staff-device': device.publicKey,
    'x-viral-sync-staff-signature': signature,
    'x-viral-sync-staff-timestamp': timestamp,
    'x-viral-sync-staff-nonce': noncePayload.nonce,
  };
}

export function rememberStaffDevice(device: StoredStaffDevice) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STAFF_DEVICE_STORAGE_KEY, JSON.stringify(device));
}

export async function fetchConsumerSummary(sessionId: string) {
  const response = await fetch(`/api/launch/consumer/summary?sessionId=${encodeURIComponent(sessionId)}`, {
    cache: 'no-store',
  });
  return parseJson<ConsumerSummary>(response);
}

export async function fetchMerchantSummary() {
  const response = await fetch('/api/launch/merchant/summary', { cache: 'no-store' });
  return parseJson<MerchantSummary>(response);
}

export async function ensureConsumerReferral(sessionId: string, displayName: string, deviceFingerprint: string) {
  const response = await fetch('/api/launch/referrals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, displayName, deviceFingerprint }),
  });
  return parseJson<ReferralCreateResult>(response);
}

export async function fetchReferralDetail(token: string, sessionId?: string) {
  const suffix = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  const response = await fetch(`/api/launch/referrals/${encodeURIComponent(token)}${suffix}`, {
    cache: 'no-store',
  });
  return parseJson<ReferralDetail>(response);
}

export async function recordReferralOpen(token: string) {
  const response = await fetch(`/api/launch/referrals/${encodeURIComponent(token)}/open`, {
    method: 'POST',
  });
  return parseJson<{ ok: true }>(response);
}

export async function claimReferralLink(token: string, payload: {
  sessionId: string;
  displayName: string;
  deviceFingerprint: string;
}) {
  const response = await fetch(`/api/launch/referrals/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json() as ClaimResult & { error?: string };
  if (!response.ok && !result.ok) {
    return result;
  }
  return result;
}

export async function createRedeemCode(sessionId: string) {
  const response = await fetch('/api/launch/redeem-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  const result = await response.json() as RedeemCodeResult & { error?: string };
  if (!response.ok && !result.ok) {
    return result;
  }
  return result;
}

export async function confirmMerchantCode(code: string, staffPin: string, manualReceiptId?: string) {
  const signedHeaders = await staffDeviceHeaders('merchant-confirm', code, staffPin);
  const response = await fetch('/api/launch/merchant/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...signedHeaders },
    body: JSON.stringify({ code, staffPin, manualReceiptId }),
  });

  const result = await response.json() as MerchantConfirmResult & { error?: string };
  if (!response.ok && !result.ok) {
    return result;
  }
  return result;
}
