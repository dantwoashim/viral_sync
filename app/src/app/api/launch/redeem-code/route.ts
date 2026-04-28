import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requireJsonRequest } from '@/lib/launch/api';
import { generateRedeemCode, isValidSessionId } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'redeem-code', 30);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const body = await readJsonBody(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!sessionId || !isValidSessionId(sessionId)) {
    return jsonError('A valid sessionId is required.', 400);
  }

  const result = await generateRedeemCode({ sessionId });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
