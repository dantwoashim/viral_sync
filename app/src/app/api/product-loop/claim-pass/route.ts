import { NextResponse } from 'next/server';
import { createVisitPassPacket } from '@/lib/product-loop/productLoop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function allowedOrigins() {
  return [process.env.NEXT_PUBLIC_APP_URL, process.env.LAUNCH_ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function mutationOrigin(request: Request) {
  const origin = request.headers.get('origin')?.replace(/\/$/, '');
  if (!origin) return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  if (process.env.NODE_ENV !== 'production' && allowedOrigins().length === 0) return origin;
  return allowedOrigins().includes(origin) ? origin : 'null';
}

function withHeaders(response: NextResponse, request: Request) {
  response.headers.set('Access-Control-Allow-Origin', mutationOrigin(request));
  response.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Vary', 'Origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function OPTIONS(request: Request) {
  return withHeaders(new NextResponse(null, { status: 204 }), request);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: string; token?: string } | null;
  const slug = body?.slug?.trim();
  if (!slug) {
    return withHeaders(NextResponse.json({ ok: false, error: 'campaign_slug_required' }, { status: 400 }), request);
  }

  let pass = null;
  try {
    pass = createVisitPassPacket(slug, body?.token?.trim() || slug);
  } catch {
    return withHeaders(NextResponse.json({ ok: false, error: 'pass_issuance_not_available' }, { status: 503 }), request);
  }
  if (!pass) {
    return withHeaders(NextResponse.json({ ok: false, error: 'proof_backed_campaign_not_found' }, { status: 404 }), request);
  }

  return withHeaders(NextResponse.json(pass), request);
}
