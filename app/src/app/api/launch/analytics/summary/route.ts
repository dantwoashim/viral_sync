import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getCanonicalMetricDictionary, getCohortDashboard, getDataQualityChecks, getEventPipelineCleanup, getRoiDashboardV2, getSubmissionMetricsExport, getWeeklyAnalyticsReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, metrics: getCanonicalMetricDictionary(), pipeline: await getEventPipelineCleanup(), cohorts: await getCohortDashboard(), roi: await getRoiDashboardV2(), quality: await getDataQualityChecks(), export: await getSubmissionMetricsExport(), review: await getWeeklyAnalyticsReview() }));
}
