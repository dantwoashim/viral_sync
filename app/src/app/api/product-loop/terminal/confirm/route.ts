import { NextResponse } from 'next/server';
import { confirmVisitPass } from '@/lib/product-loop/productLoop';

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
  const body = await request.json().catch(() => null) as { passCode?: string; slug?: string; token?: string } | null;
  const result = confirmVisitPass({
    passCode: body?.passCode,
    slug: body?.slug,
    token: body?.token,
  });
  return withHeaders(NextResponse.json(result, { status: result.ok ? 200 : 422 }));
}
