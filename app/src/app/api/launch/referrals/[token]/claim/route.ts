import { NextRequest, NextResponse } from 'next/server';
import { claimReferral } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const body = await request.json();
  const claimerSessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const claimerDisplayName = typeof body?.displayName === 'string' ? body.displayName : 'Guest';
  const deviceFingerprint = typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : claimerSessionId;

  if (!claimerSessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const result = await claimReferral({
    token,
    claimerSessionId,
    claimerDisplayName,
    deviceFingerprint,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
