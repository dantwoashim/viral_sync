import { NextRequest, NextResponse } from 'next/server';
import { confirmRedeemCode } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString, unauthorized } from '@/lib/launch/http';
import { getMerchantSession } from '@/lib/launch/merchantAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = getMerchantSession(request);
  if (!session.authenticated || !session.merchantId || !session.operatorLabel) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  const code = readString(body.code);

  if (!code) {
    return badRequest('code is required.');
  }

  const result = await confirmRedeemCode({
    code,
    merchantId: session.merchantId,
    operatorLabel: session.operatorLabel,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
