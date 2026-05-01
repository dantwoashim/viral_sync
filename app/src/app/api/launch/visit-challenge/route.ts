import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireMerchantRequestRole, requireSameOrigin, staffDeviceFromRequest, staffPinFromRequest, withSecurityHeaders } from '@/lib/launch/api';
import { createVisitChallengeForRedeemCode, isValidRedeemCode, normalizeRedeemCode } from '@/lib/launch/server';
import { demoPinAccepted, isProductionRuntime } from '@/lib/launch/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'visit-challenge', 30);
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
  const code = typeof body?.code === 'string' ? normalizeRedeemCode(body.code) : '';
  const staffPin = staffPinFromRequest(request, body);
  const staffDevicePublicKey = staffDeviceFromRequest(request);
  const merchantAuth = await requireMerchantRequestRole(request, ['staff']);
  const localDemoAllowed = !merchantAuth.ok && demoPinAccepted(staffPin);

  if (!merchantAuth.ok && !localDemoAllowed) {
    return merchantAuth.response;
  }

  if (isProductionRuntime() && !staffDevicePublicKey) {
    return jsonError('An enrolled staff device is required to create a visit challenge in production.', 403, 'staff_device_required', requestId(request));
  }

  if (!code || !isValidRedeemCode(code)) {
    return jsonError('A valid code is required.', 400);
  }

  const result = await createVisitChallengeForRedeemCode({ code });
  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 409 }));
}
