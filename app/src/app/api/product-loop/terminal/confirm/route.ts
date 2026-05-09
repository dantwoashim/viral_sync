import { NextResponse } from 'next/server';
import { confirmVisitPass } from '@/lib/product-loop/productLoop';

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
