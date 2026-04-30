import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getAutomatedInvoiceGeneration, getDunningReminders, getFeeModelFinalization, getPaidMerchantPush, getPaymentCollectionIntegration, getRevenueDashboard, getWeeklyBillingReview } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    feeModel: getFeeModelFinalization(),
    invoice: await getAutomatedInvoiceGeneration(),
    collection: getPaymentCollectionIntegration(),
    dunning: getDunningReminders(),
    revenue: await getRevenueDashboard(),
    paidPush: await getPaidMerchantPush(),
    review: await getWeeklyBillingReview(),
  }));
}
