import { NextRequest, NextResponse } from 'next/server';
import { attachConsumerSession, getOrCreateConsumerSession } from '@/lib/launch/consumerAuth';
import { requireConsumerLaunchReadiness } from '@/lib/launch/guard';
import { getConsumerSummary } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const launchGuard = requireConsumerLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getOrCreateConsumerSession(request);
  const summary = await getConsumerSummary(session.sessionId!);
  const response = NextResponse.json(summary);
  attachConsumerSession(response, session);
  return response;
}
