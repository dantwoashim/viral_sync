import { NextResponse } from 'next/server';
import { withCorsHeaders } from '@/lib/http/cors';
import { confirmVisitPass } from '@/lib/product-loop/productLoop';

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
  const body = await request.json().catch(() => null) as { passCode?: string; passMac?: string; slug?: string; token?: string; passId?: string; nonce?: string; terminalDevicePda?: string; merchantAlias?: string } | null;
  const result = confirmVisitPass({
    passCode: body?.passCode,
    passMac: body?.passMac,
    slug: body?.slug,
    token: body?.token,
    passId: body?.passId,
    nonce: body?.nonce,
    terminalDevicePda: body?.terminalDevicePda,
    merchantAlias: body?.merchantAlias,
  });
  return withHeaders(NextResponse.json(result, { status: result.ok ? 200 : 422 }), request);
}
