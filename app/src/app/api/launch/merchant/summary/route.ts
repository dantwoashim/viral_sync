import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/launch/api';
import { getMerchantSummary } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, 'merchant-summary', 90);
  if (limited) {
    return limited;
  }

  const summary = await getMerchantSummary();
  return NextResponse.json(summary);
}
