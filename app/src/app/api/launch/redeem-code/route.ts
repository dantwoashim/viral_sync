import { NextRequest, NextResponse } from 'next/server';
import { generateRedeemCode } from '@/lib/launch/server';
import { badRequest, readJsonBody, readString } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const sessionId = readString(body.sessionId);

  if (!sessionId) {
    return badRequest('sessionId is required.');
  }

  const result = await generateRedeemCode({ sessionId });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
