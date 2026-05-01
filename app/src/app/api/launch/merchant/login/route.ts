import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { createMerchantSession } from '@/lib/launch/server';
import { validateMerchantLogin } from '@/lib/launch/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-login', 20);
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
  const parsed = validateMerchantLogin(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400, 'invalid_request', requestId(request), parsed.details);
  }
  const result = await createMerchantSession({
    staffPin: parsed.value.staffPin,
    accessToken: parsed.value.accessToken,
    role: parsed.value.role,
    label: parsed.value.label,
    requestId: requestId(request),
  });
  const response = withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 401 }));

  if (result.ok && result.session) {
    response.cookies.set('vs_merchant_session', result.session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
  }

  return response;
}
