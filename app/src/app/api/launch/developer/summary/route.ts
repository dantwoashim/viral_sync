import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getDeveloperDocsV2, getDeveloperSdkPackageV2, getDeveloperSdkSurfaceV2, getExampleReceiptGraphAppV2, getVerificationApiV2, getWebhookSigningV2, getWeeklyDeveloperReviewV2 } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, surface: getDeveloperSdkSurfaceV2(), package: getDeveloperSdkPackageV2(), verification: await getVerificationApiV2(), example: getExampleReceiptGraphAppV2(), docs: getDeveloperDocsV2(), webhook: getWebhookSigningV2(), review: getWeeklyDeveloperReviewV2() }));
}
