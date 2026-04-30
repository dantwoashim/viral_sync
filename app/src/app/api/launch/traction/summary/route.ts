import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getFinalCaseStudy, getFinalMetricsAudit, getMerchantProofSprint, getPaidCommitmentPushFinal, getPublicTractionPageSummary, getWeeklyTractionReviewFinal } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, merchantProof: await getMerchantProofSprint(), metricsAudit: await getFinalMetricsAudit(), caseStudy: await getFinalCaseStudy(), paidPush: getPaidCommitmentPushFinal(), publicPage: await getPublicTractionPageSummary(), review: await getWeeklyTractionReviewFinal() }));
}
