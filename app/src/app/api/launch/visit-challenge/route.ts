import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requireJsonRequest } from '@/lib/launch/api';
import { createVisitChallengeForRedeemCode, isValidRedeemCode, normalizeRedeemCode } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'visit-challenge', 30);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const body = await readJsonBody(request);
  const code = typeof body?.code === 'string' ? normalizeRedeemCode(body.code) : '';
  const staffPin = typeof body?.staffPin === 'string'
    ? body.staffPin
    : request.headers.get('x-viral-sync-staff-pin') ?? '';
  const expectedStaffPin = process.env.LAUNCH_STAFF_PIN || 'DEMO-PIN';

  if (!staffPin || staffPin !== expectedStaffPin) {
    return jsonError('Staff authorization is required to create a visit challenge.', 401);
  }

  if (!code || !isValidRedeemCode(code)) {
    return jsonError('A valid code is required.', 400);
  }

  const result = await createVisitChallengeForRedeemCode({ code });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
