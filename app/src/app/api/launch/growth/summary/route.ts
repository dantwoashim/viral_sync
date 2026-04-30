import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getOnboardingConversion, getMerchantHealthScores, getWeeklyGrowthReview, getTractionDashboard } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    onboarding: await getOnboardingConversion(),
    health: await getMerchantHealthScores(),
    growth: await getWeeklyGrowthReview(),
    traction: await getTractionDashboard(),
  }));
}
