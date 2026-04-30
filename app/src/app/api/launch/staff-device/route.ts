import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, staffPinFromRequest } from '@/lib/launch/api';
import { enrollStaffDevice, revokeStaffDevice } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'staff-device', 20);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const body = await readJsonBody(request);
  const action = typeof body?.action === 'string' ? body.action : 'enroll';
  const staffPin = staffPinFromRequest(request, body);

  if (action === 'revoke') {
    const deviceId = typeof body?.deviceId === 'string' ? body.deviceId : '';
    if (!deviceId) {
      return jsonError('deviceId is required.', 400);
    }
    const result = await revokeStaffDevice({ staffPin, deviceId, requestId: requestId(request) });
    return NextResponse.json(result, { status: result.ok ? 200 : 401 });
  }

  const result = await enrollStaffDevice({
    staffPin,
    label: typeof body?.label === 'string' ? body.label : 'Staff terminal',
    locationLabel: typeof body?.locationLabel === 'string' ? body.locationLabel : 'Thamel Coffee Lane',
    requestId: requestId(request),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 401 });
}
