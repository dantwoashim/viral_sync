import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireSameOrigin } from '@/lib/launch/api';
import {
  ensureReferralLink,
  isValidSessionId,
  sanitizeDeviceFingerprint,
  sanitizeDisplayName,
} from '@/lib/launch/server';
import { validateReferralCreate } from '@/lib/launch/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'referrals-create', 20);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }

  const body = await readJsonBody(request);
  const parsed = validateReferralCreate(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400, 'invalid_request', requestId(request), parsed.details);
  }
  const sessionId = parsed.value.sessionId;
  const displayName = sanitizeDisplayName(parsed.value.displayName);
  const deviceFingerprint = sanitizeDeviceFingerprint(parsed.value.deviceFingerprint, sessionId);

  if (!sessionId || !isValidSessionId(sessionId)) {
    return jsonError('A valid sessionId is required.', 400);
  }

  const referral = await ensureReferralLink({ sessionId, displayName, deviceFingerprint });
  return NextResponse.json(referral);
}
