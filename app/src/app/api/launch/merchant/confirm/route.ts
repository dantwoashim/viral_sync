import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody } from '@/lib/launch/api';
import { confirmRedeemCode, isValidRedeemCode, normalizeRedeemCode } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-confirm', 30);
  if (limited) {
    return limited;
  }

  const body = await readJsonBody(request);
  const code = typeof body?.code === 'string' ? body.code : '';
  const normalizedCode = normalizeRedeemCode(code);

  if (!normalizedCode || !isValidRedeemCode(normalizedCode)) {
    return jsonError('A valid code is required.', 400);
  }

  const result = await confirmRedeemCode({ code: normalizedCode });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
