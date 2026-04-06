import { NextRequest, NextResponse } from 'next/server';
import { getMerchantSummary } from '@/lib/launch/server';
import { getMerchantSession } from '@/lib/launch/merchantAuth';
import { unauthorized } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = getMerchantSession(request);
  if (!session.authenticated) {
    return unauthorized();
  }

  const summary = await getMerchantSummary();
  return NextResponse.json(summary);
}
