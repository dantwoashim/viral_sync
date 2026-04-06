import { NextRequest, NextResponse } from 'next/server';
import {
  attachMerchantSession,
  clearMerchantSession,
  createMerchantSession,
  getMerchantSession,
  isMerchantSessionConfigured,
  verifyMerchantAccessCode,
} from '@/lib/launch/merchantAuth';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isMerchantSessionConfigured()) {
    return NextResponse.json(
      { authenticated: false, reason: 'Merchant operator access is not configured.' },
      { status: 503 },
    );
  }

  const session = getMerchantSession(request);
  return NextResponse.json(session, { status: session.authenticated ? 200 : 401 });
}

export async function POST(request: NextRequest) {
  if (!isMerchantSessionConfigured()) {
    return NextResponse.json(
      { error: 'Merchant operator access is not configured.' },
      { status: 503 },
    );
  }

  const body = await readJsonBody(request);
  const accessCode = readString(body.accessCode);
  const operatorLabel = readString(body.operatorLabel);

  if (!accessCode) {
    return badRequest('accessCode is required.');
  }
  if (!operatorLabel) {
    return badRequest('operatorLabel is required.');
  }
  if (!verifyMerchantAccessCode(accessCode)) {
    return NextResponse.json({ error: 'Invalid merchant access code.' }, { status: 401 });
  }

  const session = createMerchantSession(operatorLabel);
  if (!session) {
    return badRequest('operatorLabel is required.');
  }

  const response = NextResponse.json(session);
  attachMerchantSession(response, session);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearMerchantSession(response);
  return response;
}
