import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getOneMerchantPosPilot, getPosAdapterSkeleton, getPosFailureHandling, getPosReconciliationUi, getSelectedPosImportPath, getWeeklyPosReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    selected: getSelectedPosImportPath(),
    adapter: getPosAdapterSkeleton(),
    reconciliation: getPosReconciliationUi(),
    failures: getPosFailureHandling(),
    pilot: await getOneMerchantPosPilot(),
    review: await getWeeklyPosReview(),
  }));
}
