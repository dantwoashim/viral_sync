import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getDemoDataFreeze, getFreshCloneTestSummary, getFullCiGreenSummary, getPerformanceSmokeSummary, getProtocolFinalReview, getSecurityFinalScan, getWeeklyHardeningReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, clone: getFreshCloneTestSummary(), ci: getFullCiGreenSummary(), protocol: getProtocolFinalReview(), security: getSecurityFinalScan(), demoData: getDemoDataFreeze(), smoke: getPerformanceSmokeSummary(), review: getWeeklyHardeningReview() }));
}
