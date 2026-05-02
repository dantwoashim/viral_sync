import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, guestSessionFromRequest, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { generateRedeemCode, isValidSessionId } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'redeem-code', 30);
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

  const body = await readJsonBody(request);
  const bodySessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const cookieSessionId = guestSessionFromRequest(request);
  const sessionId = cookieSessionId || bodySessionId;

  if (!sessionId || !isValidSessionId(sessionId)) {
    return jsonError('A valid sessionId is required.', 400);
  }
  if (cookieSessionId && bodySessionId && bodySessionId !== cookieSessionId) {
    return jsonError('Session body does not match the guest cookie.', 403, 'session_mismatch', requestId(request));
  }

  const result = await generateRedeemCode({ sessionId });
  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 409 }));
}
