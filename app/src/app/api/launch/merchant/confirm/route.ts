import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, idempotencyKey, jsonError, readJsonBody, requestId, requireJsonRequest, requireSameOrigin, staffDeviceFromRequest, staffPinFromRequest, withSecurityHeaders } from '@/lib/launch/api';
import { confirmRedeemCode, isValidRedeemCode, normalizeRedeemCode } from '@/lib/launch/server';
import { validateRedeemCodeBody } from '@/lib/launch/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-confirm', 30);
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
  const parsed = validateRedeemCodeBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400, 'invalid_request', requestId(request), parsed.details);
  }
  const code = parsed.value.code;
  const staffPin = staffPinFromRequest(request, body);
  const expectedStaffPin = process.env.LAUNCH_STAFF_PIN || 'DEMO-PIN';
  const normalizedCode = normalizeRedeemCode(code);

  if (!staffPin || staffPin !== expectedStaffPin) {
    return jsonError('Staff authorization is required to confirm a redemption.', 401);
  }

  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return jsonError('A valid code is required.', 400);
  }

  const result = await confirmRedeemCode({
    code: normalizedCode,
    staffPin,
    requestId: requestId(request),
    idempotencyKey: idempotencyKey(request, `confirm:${normalizedCode}`),
    staffDevicePublicKey: staffDeviceFromRequest(request),
    manualReceiptId: parsed.value.manualReceiptId,
  });
  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 409 }));
}
