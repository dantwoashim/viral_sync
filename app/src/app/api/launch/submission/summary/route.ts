import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getFinalDemoScript, getFinalReadmeRewritePlan, getInvestorMemo, getWeeklyTractionReviewFinal } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, readme: getFinalReadmeRewritePlan(), demoScript: getFinalDemoScript(), investorMemo: getInvestorMemo(), tractionReview: await getWeeklyTractionReviewFinal() }));
}
