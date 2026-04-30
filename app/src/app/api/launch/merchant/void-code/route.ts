import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, merchantSessionFromRequest, readJsonBody, requestId, requireJsonRequest, requireSameOrigin } from '@/lib/launch/api';
import { voidRedeemCode } from '@/lib/launch/server';
import { validateRedeemCodeBody } from '@/lib/launch/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-void-code', 20);
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
  const reason = parsed.value.reason ?? '';
  const managerSessionId = merchantSessionFromRequest(request);

  if (!managerSessionId) {
    return jsonError('Manager session is required.', 401);
  }

  if (!reason.trim()) {
    return jsonError('A manager override reason is required.', 400);
  }

  const result = await voidRedeemCode({ code, reason, managerSessionId, requestId: requestId(request) });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
