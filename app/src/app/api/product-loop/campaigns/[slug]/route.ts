import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { findProductLoopCampaign } from '@/lib/product-loop/productLoop';

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
  const campaign = findProductLoopCampaign(decodeURIComponent(slug));
  if (!campaign) return json({ ok: false, error: 'campaign_not_found' }, 404);
  return json({ ok: true, campaign });
}
