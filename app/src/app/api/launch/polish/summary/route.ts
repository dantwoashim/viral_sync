import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getAccessibilityPassSummary, getCopyPolishSummary, getDashboardPolishSummary, getMobilePolishSummary, getReceiptExplorerPolishSummary, getUxAuditSummary, getWeeklyPolishReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, ux: getUxAuditSummary(), mobile: getMobilePolishSummary(), copy: getCopyPolishSummary(), dashboard: getDashboardPolishSummary(), receipt: getReceiptExplorerPolishSummary(), accessibility: getAccessibilityPassSummary(), review: getWeeklyPolishReview() }));
}
