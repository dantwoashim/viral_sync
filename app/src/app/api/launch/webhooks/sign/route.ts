import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requireJsonRequest, withSecurityHeaders } from '@/lib/launch/api';
import { signWebhookPayload, verifyWebhookSignature } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const contentTypeError = requireJsonRequest(request);
  if (contentTypeError) {
    return contentTypeError;
  }
  const rateLimited = enforceRateLimit(request, 'webhook-sign', 60);
  if (rateLimited) {
    return rateLimited;
  }
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return jsonError('Valid JSON body is required.', 400, 'invalid_body');
  }
  const event = body as Record<string, unknown>;
  const payload = JSON.stringify(event.payload ?? event);
  const signature = signWebhookPayload(payload);
  const provided = typeof event.signature === 'string' ? event.signature : signature;

  return withSecurityHeaders(NextResponse.json({
    ok: true,
    payload,
    signature,
    verifies: verifyWebhookSignature(payload, provided),
    header: 'X-Viral-Sync-Signature',
  }));
}
