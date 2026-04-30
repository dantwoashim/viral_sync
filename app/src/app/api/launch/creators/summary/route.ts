import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getCreatorCampaignSpec, getCreatorLinkAnalytics, getCreatorOnboarding, getCreatorPayoutSettlement, getFraudAwareCreatorLeaderboard, getMicroCreatorTest, getWeeklyCreatorReview, getWeeklyDeveloperReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    developerReview: getWeeklyDeveloperReview(),
    spec: getCreatorCampaignSpec(),
    onboarding: getCreatorOnboarding(),
    analytics: await getCreatorLinkAnalytics(),
    payouts: await getCreatorPayoutSettlement(),
    leaderboard: await getFraudAwareCreatorLeaderboard(),
    microTest: getMicroCreatorTest(),
    weeklyReview: await getWeeklyCreatorReview(),
  }));
}
