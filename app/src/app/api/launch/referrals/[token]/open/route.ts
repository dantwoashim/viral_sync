import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { enforceRateLimit, jsonError } from '@/lib/launch/api';
import { isValidReferralToken, recordReferralOpen } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const limited = enforceRateLimit(request, 'referral-open', 120);
  if (limited) {
    return limited;
  }

  const { token } = await context.params;
  if (!isValidReferralToken(token)) {
    return jsonError('Referral not found.', 404);
  }

  const ok = await recordReferralOpen(token);

  if (!ok) {
    return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
