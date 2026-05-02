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

const STAFF_DEVICE_STORAGE_KEY = 'viral-sync-staff-device-session';
const STAFF_DEVICE_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type StoredStaffDevice = {
  publicKey: string;
  algorithm: 'ecdsa-p256' | 'hmac-sha256-demo';
  privateKeyJwk?: JsonWebKey;
  secret?: string;
  expiresAt: number;
};

function normalizeCodeForSignature(code: string) {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256HexBrowser(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function createStaffDeviceKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyMaterial = JSON.stringify(publicKeyJwk);
  const publicKey = `staff_${(await sha256HexBrowser(`staff-device:${publicKeyMaterial}`)).slice(0, 32)}`;
  return { publicKey, publicKeyMaterial, privateKeyJwk };
}

async function staffDeviceHeaders(action: string, code?: string, staffPin?: string): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.sessionStorage.getItem(STAFF_DEVICE_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  const device = JSON.parse(raw) as Partial<StoredStaffDevice>;
  if (!device.publicKey || (!device.privateKeyJwk && !device.secret) || !device.expiresAt || device.expiresAt < Date.now()) {
    window.sessionStorage.removeItem(STAFF_DEVICE_STORAGE_KEY);
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
  let signature = '';
  if (device.privateKeyJwk) {
    const key = await crypto.subtle.importKey(
      'jwk',
      device.privateKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    signature = bytesToBase64Url(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(message)));
  } else if (device.secret) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(device.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    signature = bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  }

  if (!signature) {
    return {};
  }

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

  window.sessionStorage.setItem(STAFF_DEVICE_STORAGE_KEY, JSON.stringify(device));
}

export async function enrollStaffDeviceTerminal(params: {
  staffPin: string;
  label?: string;
  locationLabel?: string;
}) {
  const generated = await createStaffDeviceKeypair();
  const response = await fetch('/api/launch/staff-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'enroll',
      staffPin: params.staffPin,
      label: params.label ?? 'Counter terminal',
      locationLabel: params.locationLabel ?? 'Front counter',
      publicKey: generated.publicKey,
      publicKeyAlgorithm: 'ecdsa-p256',
      publicKeyMaterial: generated.publicKeyMaterial,
    }),
  });
  const result = await parseJson<{ ok: boolean; device?: { publicKey: string }; reason?: string }>(response);
  if (result.ok) {
    rememberStaffDevice({
      publicKey: generated.publicKey,
      algorithm: 'ecdsa-p256',
      privateKeyJwk: generated.privateKeyJwk,
      expiresAt: Date.now() + STAFF_DEVICE_SESSION_TTL_MS,
    });
  }
  return result;
}

export function hasRememberedStaffDevice() {
  if (typeof window === 'undefined') {
    return false;
  }
  const raw = window.sessionStorage.getItem(STAFF_DEVICE_STORAGE_KEY);
  if (!raw) {
    return false;
  }
  try {
    const device = JSON.parse(raw) as Partial<StoredStaffDevice>;
    return Boolean(device.publicKey && (device.privateKeyJwk || device.secret) && device.expiresAt && device.expiresAt > Date.now());
  } catch {
    return false;
  }
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
