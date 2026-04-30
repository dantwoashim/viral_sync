import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getActivationRedesign, getChurnAnalysis, getMerchantSuccessPlaybooks, getPartnerNetworkCore, getPartnerNetworkExpansionPlan, getPartnerNetworkHardening, getPartnerNetworkIntegration, getPartnerNetworkMeasurement, getPartnerNetworkPilot, getRecurringCampaignTemplates, getRetentionCaseStudy, getStaffAdherenceTools, getWeeklyRetentionReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, churn: await getChurnAnalysis(), activation: getActivationRedesign(), playbooks: getMerchantSuccessPlaybooks(), recurring: getRecurringCampaignTemplates(), staff: getStaffAdherenceTools(), caseStudy: await getRetentionCaseStudy(), review: await getWeeklyRetentionReview(), partnerPlan: getPartnerNetworkExpansionPlan(), partnerCore: await getPartnerNetworkCore(), partnerIntegration: await getPartnerNetworkIntegration(), partnerHardening: getPartnerNetworkHardening(), partnerMeasurement: await getPartnerNetworkMeasurement(), partnerPilot: await getPartnerNetworkPilot() }));
}
