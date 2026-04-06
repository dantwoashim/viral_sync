import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantLaunchReadiness } from '@/lib/launch/guard';
import { confirmRedeemCode } from '@/lib/launch/server';
import { badRequest, readJsonBody, unauthorized } from '@/lib/launch/http';
import { getMerchantSession } from '@/lib/launch/merchantAuth';
import { merchantConfirmSchema } from '@/lib/launch/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const launchGuard = requireMerchantLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getMerchantSession(request);
  if (!session.authenticated || !session.merchantId || !session.operatorLabel) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  const parsed = merchantConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid confirmation payload.');
  }

  const result = await confirmRedeemCode({
    code: parsed.data.code.toUpperCase(),
    merchantId: session.merchantId,
    operatorLabel: session.operatorLabel,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
