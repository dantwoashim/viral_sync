import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getCrossPromotionSetup, getMarketplaceControls, getMerchantDiscoveryView, getNeighborhoodCampaignDesign, getNeighborhoodTestLaunch, getRoutePassRedemption, getWeeklyMarketplaceReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    design: getNeighborhoodCampaignDesign(),
    discovery: await getMerchantDiscoveryView(),
    crossPromotion: getCrossPromotionSetup(),
    routePass: getRoutePassRedemption(),
    controls: getMarketplaceControls(),
    launch: await getNeighborhoodTestLaunch(),
    review: await getWeeklyMarketplaceReview(),
  }));
}
