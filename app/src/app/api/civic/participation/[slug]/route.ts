import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { getCivicMarket } from '@/lib/civic/civicMarket';
import { issueCivicParticipationPass } from '@/lib/civic/participationPass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'GET,POST,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'GET,POST,OPTIONS', 'Content-Type');
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json(issueCivicParticipationPass(market));
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => null) as { participantLabel?: string } | null;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json(issueCivicParticipationPass(market, body?.participantLabel?.trim() || 'anonymous participant'));
}
