import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError } from '@/lib/launch/api';
import { getReferralDetail, isValidReferralToken, isValidSessionId } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const limited = enforceRateLimit(request, 'referral-detail', 120);
  if (limited) {
    return limited;
  }

  const { token } = await context.params;
  const viewerSessionId = request.nextUrl.searchParams.get('sessionId') ?? undefined;

  if (!isValidReferralToken(token) || (viewerSessionId && !isValidSessionId(viewerSessionId))) {
    return jsonError('Referral not found.', 404);
  }

  const detail = await getReferralDetail(token, viewerSessionId);

  if (!detail) {
    return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
  }

  return NextResponse.json(detail);
}
