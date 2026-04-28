import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requireJsonRequest } from '@/lib/launch/api';
import {
  ensureReferralLink,
  isValidSessionId,
  sanitizeDeviceFingerprint,
  sanitizeDisplayName,
} from '@/lib/launch/server';

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

  const body = await readJsonBody(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const displayName = sanitizeDisplayName(typeof body?.displayName === 'string' ? body.displayName : 'Guest');
  const deviceFingerprint = sanitizeDeviceFingerprint(typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : sessionId, sessionId);

  if (!sessionId || !isValidSessionId(sessionId)) {
    return jsonError('A valid sessionId is required.', 400);
  }

  const referral = await ensureReferralLink({ sessionId, displayName, deviceFingerprint });
  return NextResponse.json(referral);
}
