import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireMerchantRequestRole, requireSameOrigin, staffPinFromRequest, withSecurityHeaders } from '@/lib/launch/api';
import { enrollStaffDevice, revokeStaffDevice } from '@/lib/launch/server';
import { demoPinAccepted } from '@/lib/launch/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'staff-device', 20);
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
  const action = typeof body?.action === 'string' ? body.action : 'enroll';
  const staffPin = staffPinFromRequest(request, body);
  const merchantAuth = await requireMerchantRequestRole(request, ['manager']);
  const localDemoAllowed = !merchantAuth.ok && demoPinAccepted(staffPin);
  if (!merchantAuth.ok && !localDemoAllowed) {
    return merchantAuth.response;
  }
  const authorizedActorId = merchantAuth.ok ? merchantAuth.session.id : undefined;

  if (action === 'revoke') {
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : '';
    if (!deviceId) {
      return jsonError('deviceId is required.', 400);
    }
    const result = await revokeStaffDevice({ staffPin, authorizedActorId, deviceId, requestId: requestId(request) });
    return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 401 }));
  }

  const result = await enrollStaffDevice({
    staffPin,
    authorizedActorId,
    label: typeof body?.label === 'string' ? body.label : 'Staff terminal',
    locationLabel: typeof body?.locationLabel === 'string' ? body.locationLabel : 'Thamel Coffee Lane',
    requestId: requestId(request),
  });
  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 401 }));
}
