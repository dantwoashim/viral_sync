import { NextRequest, NextResponse } from 'next/server';
import { claimReferral } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const body = await readJsonBody(request);
  const claimerSessionId = readString(body.sessionId);
  const claimerDisplayName = readString(body.displayName, 'Guest');
  const deviceFingerprint = readString(body.deviceFingerprint, claimerSessionId);

  if (!claimerSessionId) {
    return badRequest('sessionId is required.');
  }

  const result = await claimReferral({
    token,
    claimerSessionId,
    claimerDisplayName,
    deviceFingerprint,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
