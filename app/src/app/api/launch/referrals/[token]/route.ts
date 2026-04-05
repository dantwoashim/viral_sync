import { NextRequest, NextResponse } from 'next/server';
import { getReferralDetail } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const viewerSessionId = request.nextUrl.searchParams.get('sessionId') ?? undefined;
  const detail = await getReferralDetail(token, viewerSessionId);

  if (!detail) {
    return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
