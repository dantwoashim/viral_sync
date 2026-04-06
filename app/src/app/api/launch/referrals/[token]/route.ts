import { NextRequest, NextResponse } from 'next/server';
import { attachConsumerSession, getOrCreateConsumerSession } from '@/lib/launch/consumerAuth';
import { requireConsumerLaunchReadiness } from '@/lib/launch/guard';
import { getReferralDetail } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const launchGuard = requireConsumerLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const { token } = await context.params;
  const session = getOrCreateConsumerSession(request);
  const detail = await getReferralDetail(token, session.sessionId);

  if (!detail) {
    return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
  }

  const response = NextResponse.json(detail);
  attachConsumerSession(response, session);
  return response;
}
