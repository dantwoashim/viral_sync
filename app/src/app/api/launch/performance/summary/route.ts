import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getApiLoadTestSummary, getDashboardPerformanceSummary, getDatabaseIndexReview, getLoadTestPlan, getMobilePerformanceSummary, getRelayerIndexerStressSummary, getWeeklyPerformanceReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, plan: getLoadTestPlan(), api: getApiLoadTestSummary(), database: getDatabaseIndexReview(), dashboard: await getDashboardPerformanceSummary(), relayer: await getRelayerIndexerStressSummary(), mobile: getMobilePerformanceSummary(), review: getWeeklyPerformanceReview() }));
}
