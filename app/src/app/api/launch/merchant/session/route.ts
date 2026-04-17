import { NextRequest, NextResponse } from 'next/server';
import {
  attachMerchantSession,
  clearMerchantSession,
  createMerchantSession,
  getMerchantSession,
  isMerchantSessionConfigured,
} from '@/lib/launch/merchantAuth';
import { badRequest, readJsonBody } from '@/lib/launch/http';
import { merchantSessionSchema } from '@/lib/launch/schemas';
import { authenticateMerchantOperator } from '@/lib/launch/server';

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
  const parsed = merchantSessionSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid merchant session request.');
  }
  const authResult = await authenticateMerchantOperator({
    merchantSlug: parsed.data.merchantSlug,
    operatorLabel: parsed.data.operatorLabel,
    accessCode: parsed.data.accessCode,
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.reason }, { status: 401 });
  }

  const session = createMerchantSession(authResult.identity);
  const response = NextResponse.json(session);
  attachMerchantSession(response, session);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  clearMerchantSession(response);
  return response;
}
