import { NextRequest, NextResponse } from 'next/server';
import { attachConsumerSession, getOrCreateConsumerSession } from '@/lib/launch/consumerAuth';
import { requireConsumerLaunchReadiness } from '@/lib/launch/guard';
import { ensureReferralLink } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';
import { consumerDeviceSchema } from '@/lib/launch/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const launchGuard = requireConsumerLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getOrCreateConsumerSession(request);
  const body = await readJsonBody(request);
  const parsed = consumerDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid referral request.');
  }
  const deviceFingerprint = readString(parsed.data.deviceFingerprint, session.sessionId);

  const referral = await ensureReferralLink({
    sessionId: session.sessionId!,
    displayName: session.displayName ?? 'Guest',
    deviceFingerprint,
  });
  const response = NextResponse.json(referral);
  attachConsumerSession(response, session);
  return response;
}
