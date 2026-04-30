import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getLocationAnalytics, getLocationCampaignTargeting, getLocationHierarchy, getMultiLocationSimulation, getRegionalManagerRole, getStaffTransferRevocation, getWeeklyMultiLocationReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    hierarchy: await getLocationHierarchy(),
    targeting: getLocationCampaignTargeting(),
    analytics: await getLocationAnalytics(),
    staff: await getStaffTransferRevocation(),
    regionalManager: getRegionalManagerRole(),
    simulation: await getMultiLocationSimulation(),
    review: await getWeeklyMultiLocationReview(),
  }));
}
