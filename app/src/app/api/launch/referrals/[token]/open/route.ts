import { NextResponse } from 'next/server';
import { requireLaunchPersistenceReadiness } from '@/lib/launch/guard';
import { recordReferralOpen } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const launchGuard = requireLaunchPersistenceReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const { token } = await context.params;
  const ok = await recordReferralOpen(token);

  if (!ok) {
    return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
