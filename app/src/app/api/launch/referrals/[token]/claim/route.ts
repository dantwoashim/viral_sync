import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, guestSessionFromRequest, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import {
  claimReferral,
  isValidReferralToken,
  isValidSessionId,
  sanitizeDeviceFingerprint,
  sanitizeDisplayName,
} from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const limited = enforceRateLimit(request, 'referral-claim', 20);
  if (limited) {
    return limited;
  }
  const paused = requireLaunchOpen(request);
  if (paused) {
    return paused;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }

  const { token } = await context.params;
  const body = await readJsonBody(request);
  const bodySessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const cookieSessionId = guestSessionFromRequest(request);
  const claimerSessionId = cookieSessionId || bodySessionId;
  const claimerDisplayName = sanitizeDisplayName(typeof body?.displayName === 'string' ? body.displayName : 'Guest');
  const deviceFingerprint = sanitizeDeviceFingerprint(typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : claimerSessionId, claimerSessionId);

  if (!isValidReferralToken(token) || !claimerSessionId || !isValidSessionId(claimerSessionId)) {
    return jsonError('A valid referral token and sessionId are required.', 400);
  }
  if (cookieSessionId && bodySessionId && bodySessionId !== cookieSessionId) {
    return jsonError('Session body does not match the guest cookie.', 403, 'session_mismatch', requestId(request));
  }

  const result = await claimReferral({
    token,
    claimerSessionId,
    claimerDisplayName,
    deviceFingerprint,
  });

  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 409 }));
}
