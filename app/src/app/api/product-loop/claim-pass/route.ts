import { NextResponse } from 'next/server';
import { withCorsHeaders } from '@/lib/http/cors';
import { createVisitPassPacket } from '@/lib/product-loop/productLoop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function withHeaders(response: NextResponse, request: Request) {
  return withCorsHeaders(response, request, {
    methods: 'POST,OPTIONS',
    headers: 'Content-Type',
  });
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
