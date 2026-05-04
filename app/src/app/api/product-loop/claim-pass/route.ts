import { NextResponse } from 'next/server';
import { createVisitPassPacket } from '@/lib/product-loop/productLoop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function withHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function OPTIONS() {
  return withHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { slug?: string; token?: string } | null;
  const slug = body?.slug?.trim();
  if (!slug) {
    return withHeaders(NextResponse.json({ ok: false, error: 'campaign_slug_required' }, { status: 400 }));
  }

  const pass = createVisitPassPacket(slug, body?.token?.trim() || slug);
  if (!pass) {
    return withHeaders(NextResponse.json({ ok: false, error: 'proof_backed_campaign_not_found' }, { status: 404 }));
  }

  return withHeaders(NextResponse.json(pass));
}
