import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantLaunchReadiness } from '@/lib/launch/guard';
import { getMerchantSummary } from '@/lib/launch/server';
import { getMerchantSession } from '@/lib/launch/merchantAuth';
import { unauthorized } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const launchGuard = requireMerchantLaunchReadiness();
  if (launchGuard) {
    return launchGuard;
  }

  const session = getMerchantSession(request);
  if (!session.authenticated) {
    return unauthorized();
  }

  const summary = await getMerchantSummary();
  return NextResponse.json(summary);
}
