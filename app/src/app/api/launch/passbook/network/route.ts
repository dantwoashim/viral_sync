import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getConsumerFeedbackRound, getNearbyAvailableCampaigns, getNotificationPreferences, getReferralStreaks, getRewardHistoryUi, getUnifiedPassbookNetwork, getWeeklyPassbookReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    passbook: await getUnifiedPassbookNetwork(),
    history: await getRewardHistoryUi(),
    nearby: await getNearbyAvailableCampaigns(),
    notifications: getNotificationPreferences(),
    streaks: await getReferralStreaks(),
    feedback: getConsumerFeedbackRound(),
    review: await getWeeklyPassbookReview(),
  }));
}
