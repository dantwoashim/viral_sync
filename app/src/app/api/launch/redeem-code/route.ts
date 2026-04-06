import { NextRequest, NextResponse } from 'next/server';
import { attachConsumerSession, getOrCreateConsumerSession } from '@/lib/launch/consumerAuth';
import { requireConsumerLaunchReadiness } from '@/lib/launch/guard';
import { generateRedeemCode } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const launchGuard = requireConsumerLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getOrCreateConsumerSession(request);
  const result = await generateRedeemCode({ sessionId: session.sessionId! });
  const response = NextResponse.json(result, { status: result.ok ? 200 : 409 });
  attachConsumerSession(response, session);
  return response;
}
