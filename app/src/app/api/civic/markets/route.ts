import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { getCivicMarkets } from '@/lib/civic/civicMarket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'GET,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'GET,OPTIONS', 'Content-Type');
}

export async function GET() {
  return json({ ok: true, markets: getCivicMarkets() });
}
