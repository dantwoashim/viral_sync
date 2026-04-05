import { NextResponse } from 'next/server';
import { getMerchantSummary } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const summary = await getMerchantSummary();
  return NextResponse.json(summary);
}
