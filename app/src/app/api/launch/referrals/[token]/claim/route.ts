import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody } from '@/lib/launch/api';
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

  const { token } = await context.params;
  const body = await readJsonBody(request);
  const claimerSessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const claimerDisplayName = sanitizeDisplayName(typeof body?.displayName === 'string' ? body.displayName : 'Guest');
  const deviceFingerprint = sanitizeDeviceFingerprint(typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : claimerSessionId, claimerSessionId);

  if (!isValidReferralToken(token) || !claimerSessionId || !isValidSessionId(claimerSessionId)) {
    return jsonError('A valid referral token and sessionId are required.', 400);
  }

  const result = await claimReferral({
    token,
    claimerSessionId,
    claimerDisplayName,
    deviceFingerprint,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
