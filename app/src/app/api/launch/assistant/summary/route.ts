import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getAssistantAnalytics, getCampaignAssistantSpec, getCampaignCopyGenerator, getFraudSafeAssistantRecommendations, getLiabilitySimulator, getMainnetBetaAssistantSpec, getMainnetBetaLiabilitySimulator, getMainnetBetaRuleAssistant, getRuleBasedCampaignAssistant, getWeeklyAssistantReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    spec: getCampaignAssistantSpec(),
    assistant: getRuleBasedCampaignAssistant(),
    liability: getLiabilitySimulator(),
    copy: getCampaignCopyGenerator(),
    risk: getFraudSafeAssistantRecommendations(),
    analytics: getAssistantAnalytics(),
    weeklyReview: getWeeklyAssistantReview(),
    mainnetBetaSpec: getMainnetBetaAssistantSpec(),
    mainnetBetaAssistant: getMainnetBetaRuleAssistant(),
    mainnetBetaLiability: getMainnetBetaLiabilitySimulator(),
  }));
}
