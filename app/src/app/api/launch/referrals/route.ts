import { NextRequest, NextResponse } from 'next/server';
import { ensureReferralLink } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName : 'Guest';
  const deviceFingerprint = typeof body?.deviceFingerprint === 'string' ? body.deviceFingerprint : sessionId;

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const referral = await ensureReferralLink({ sessionId, displayName, deviceFingerprint });
  return NextResponse.json(referral);
}
