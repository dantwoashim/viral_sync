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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || 'ward12-water-repair';
  const label = url.searchParams.get('participant') || 'anonymous participant';
  const market = getCivicMarket(slug);
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json(issueCivicParticipationPass(market, label));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: string; participantLabel?: string } | null;
  const market = getCivicMarket(body?.slug || 'ward12-water-repair');
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json(issueCivicParticipationPass(market, body?.participantLabel?.trim() || 'anonymous participant'));
}
