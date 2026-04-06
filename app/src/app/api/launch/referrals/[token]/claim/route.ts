import { NextRequest, NextResponse } from 'next/server';
import { attachConsumerSession, getOrCreateConsumerSession } from '@/lib/launch/consumerAuth';
import { requireConsumerLaunchReadiness } from '@/lib/launch/guard';
import { claimReferral } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';
import { consumerDeviceSchema } from '@/lib/launch/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const launchGuard = requireConsumerLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const { token } = await context.params;
  const session = getOrCreateConsumerSession(request);
  const body = await readJsonBody(request);
  const parsed = consumerDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid claim request.');
  }
  const deviceFingerprint = readString(parsed.data.deviceFingerprint, session.sessionId);

  const result = await claimReferral({
    token,
    claimerSessionId: session.sessionId!,
    claimerDisplayName: session.displayName ?? 'Guest',
    deviceFingerprint,
  });

  const response = NextResponse.json(result, { status: result.ok ? 200 : 409 });
  attachConsumerSession(response, session);
  return response;
}
