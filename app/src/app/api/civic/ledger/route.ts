import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { getFeaturedCivicMarket } from '@/lib/civic/civicMarket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'GET,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'GET,OPTIONS', 'Content-Type');
}

export async function GET() {
  const market = getFeaturedCivicMarket();
  return json({
    ok: true,
    market: market.slug,
    ledger: {
      entries: [
        { id: 'market-opened', status: 'phase_one_specified' },
        { id: 'action-pool-mapped', status: market.sponsorPool.custodyStatus },
        { id: 'receipt-recorded', status: 'verified_devnet', object: market.evidence.receiptPda },
        { id: 'reward-settled', status: 'verified_devnet', object: market.evidence.settlementPda },
        { id: 'replay-controls', status: 'verified_devnet', detail: market.evidence.gauntletLabel },
      ],
    },
    boundary: market.proofBoundary,
  });
}
