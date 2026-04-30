import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, readJsonBody, requestId, requireJsonRequest, withSecurityHeaders } from '@/lib/launch/api';
import { createReceiptVerificationIntent, getReceiptActionMetadata } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'X-Action-Version': '2.4',
};

function actionHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(ACTIONS_HEADERS)) {
    response.headers.set(key, value);
  }
  return withSecurityHeaders(response);
}

export async function OPTIONS() {
  return actionHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const metadata = await getReceiptActionMetadata(decodeURIComponent(id));
  return actionHeaders(NextResponse.json(metadata, { status: metadata.error ? 404 : 200 }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = enforceRateLimit(request, 'receipt-action-post', 60);
  if (limited) {
    return limited;
  }

  const invalidContentType = requireJsonRequest(request);
  if (invalidContentType) {
    return invalidContentType;
  }

  const { id } = await params;
  const body = await readJsonBody(request) as Record<string, unknown> | null;
  const account = typeof body?.account === 'string' ? body.account : '';
  if (!account) {
    return actionHeaders(jsonError('Wallet account is required.', 400, 'invalid_request', requestId(request)));
  }

  const intent = await createReceiptVerificationIntent({
    receiptLookup: decodeURIComponent(id),
    account,
  });

  return actionHeaders(NextResponse.json(intent, { status: intent.ok ? 200 : 400 }));
}
