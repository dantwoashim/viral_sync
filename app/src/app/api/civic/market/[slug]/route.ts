import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { getCivicMarket } from '@/lib/civic/civicMarket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'GET,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'GET,OPTIONS', 'Content-Type');
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getCivicMarket(decodeURIComponent(slug));
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json({ ok: true, market });
}
