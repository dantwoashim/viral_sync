'use client';

import type {
  ClaimResult,
  ConsumerSummary,
  MerchantOperatorLoginResult,
  MerchantOperatorSession,
  MerchantConfirmResult,
  MerchantSummary,
  OfferUpdateInput,
  OfferUpdateResult,
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

export async function fetchMerchantOperatorSession() {
  const response = await fetch('/api/launch/merchant/session', { cache: 'no-store' });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { authenticated?: boolean; reason?: string; error?: string };
    return {
      authenticated: false,
      reason: payload.reason ?? payload.error,
    } as MerchantOperatorSession & { reason?: string };
  }
  return parseJson<MerchantOperatorSession>(response);
}

export async function createMerchantOperatorSession(payload: {
  operatorLabel: string;
  accessCode: string;
}) {
  const response = await fetch('/api/launch/merchant/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<MerchantOperatorLoginResult>(response);
}

export async function destroyMerchantOperatorSession() {
  const response = await fetch('/api/launch/merchant/session', {
    method: 'DELETE',
  });
  return parseJson<{ authenticated: false }>(response);
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

export async function confirmMerchantCode(code: string) {
  const response = await fetch('/api/launch/merchant/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const result = await response.json() as MerchantConfirmResult & { error?: string };
  if (!response.ok && !result.ok) {
    return result;
  }
  return result;
}

export async function updateMerchantOffer(payload: OfferUpdateInput) {
  const response = await fetch('/api/launch/merchant/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json() as OfferUpdateResult & { error?: string };
  if (!response.ok && !result.ok) {
    return result;
  }
  return result;
}
