import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { simulateSponsoredTransaction } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'sponsored-tx', 60);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }

  const body = await readJsonBody(request) as Record<string, unknown> | null;
  if (!body) {
    return jsonError('Sponsored transaction payload is required.', 400, 'invalid_request', requestId(request));
  }

  const result = await simulateSponsoredTransaction({
    apiKey: request.headers.get('x-viral-sync-relayer-key') ?? '',
    intent: typeof body.intent === 'string' ? body.intent : '',
    signature: typeof body.signature === 'string' ? body.signature : '',
    account: typeof body.account === 'string' ? body.account : '',
    nonce: typeof body.nonce === 'string' ? body.nonce : undefined,
  });

  return withSecurityHeaders(NextResponse.json(result, { status: result.status }));
}
