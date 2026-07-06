import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { getCivicMarket } from '@/lib/civic/civicMarket';
import { buildCivicConvictionSignal, verifyCivicConvictionSignalToken } from '@/lib/civic/convictionSignal';
import type { ConvictionChoice } from '@/lib/civic/types';

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
  const market = getCivicMarket(slug);
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);
  return json(buildCivicConvictionSignal(market, {
    participantLabel: url.searchParams.get('participant') || 'anonymous participant',
    choice: (url.searchParams.get('choice') || 'repair_likely') as ConvictionChoice,
    creditsCommitted: Number(url.searchParams.get('credits') || 62),
    confidenceBps: Number(url.searchParams.get('confidenceBps') || 6200),
  }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    slug?: string;
    participantLabel?: string;
    participantAuthority?: string;
    choice?: ConvictionChoice;
    creditsCommitted?: number;
    confidenceBps?: number;
    artifactToken?: string;
  } | null;

  if (body?.artifactToken) {
    const verification = verifyCivicConvictionSignalToken(body.artifactToken);
    return json(verification, verification.ok ? 200 : 400);
  }

  const market = getCivicMarket(body?.slug || 'ward12-water-repair');
  if (!market) return json({ ok: false, error: 'civic_market_not_found' }, 404);

  try {
    return json(buildCivicConvictionSignal(market, {
      participantLabel: body?.participantLabel,
      participantAuthority: body?.participantAuthority,
      choice: body?.choice,
      creditsCommitted: body?.creditsCommitted,
      confidenceBps: body?.confidenceBps,
    }));
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'conviction_signal_failed' }, 400);
  }
}
