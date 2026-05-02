import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, idempotencyKey, jsonError, readJsonBody, requestId, requireJsonRequest, requireLaunchOpen, requireMerchantRequestRole, requireSameOrigin, staffDeviceProofFromRequest, staffPinFromRequest, withSecurityHeaders } from '@/lib/launch/api';
import { confirmRedeemCode, isValidRedeemCode, normalizeRedeemCode } from '@/lib/launch/server';
import { demoPinAccepted, isProductionRuntime } from '@/lib/launch/security';
import { validateRedeemCodeBody } from '@/lib/launch/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-confirm', 30);
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
  const parsed = validateRedeemCodeBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.message, 400, 'invalid_request', requestId(request), parsed.details);
  }
  const code = parsed.value.code;
  const staffPin = staffPinFromRequest(request, body);
  const normalizedCode = normalizeRedeemCode(code);
  const staffDeviceProof = staffDeviceProofFromRequest(request);
  const staffDevicePublicKey = staffDeviceProof.publicKey;
  const merchantAuth = await requireMerchantRequestRole(request, ['staff']);
  const localDemoAllowed = !merchantAuth.ok && demoPinAccepted(staffPin);

  if (!merchantAuth.ok && !localDemoAllowed) {
    return merchantAuth.response;
  }

  if (isProductionRuntime() && !staffDevicePublicKey) {
    return jsonError('An enrolled staff device is required to confirm a redemption in production.', 403, 'staff_device_required', requestId(request));
  }

  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return jsonError('A valid code is required.', 400);
  }

  const result = await confirmRedeemCode({
    code: normalizedCode,
    staffPin,
    requestId: requestId(request),
    idempotencyKey: idempotencyKey(request, `confirm:${normalizedCode}`),
    staffSessionId: merchantAuth.ok ? merchantAuth.session.id : undefined,
    staffDevicePublicKey,
    staffDeviceSignature: staffDeviceProof.signature,
    staffDeviceTimestamp: staffDeviceProof.timestamp,
    manualReceiptId: parsed.value.manualReceiptId,
  });
  return withSecurityHeaders(NextResponse.json(result, { status: result.ok ? 200 : 409 }));
}
