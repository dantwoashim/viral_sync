import { NextRequest, NextResponse } from 'next/server';
import { ensureReferralLink } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const sessionId = readString(body.sessionId);
  const displayName = readString(body.displayName, 'Guest');
  const deviceFingerprint = readString(body.deviceFingerprint, sessionId);

  if (!sessionId) {
    return badRequest('sessionId is required.');
  }

  const referral = await ensureReferralLink({ sessionId, displayName, deviceFingerprint });
  return NextResponse.json(referral);
}
