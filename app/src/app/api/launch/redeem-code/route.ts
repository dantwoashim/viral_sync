import { NextRequest, NextResponse } from 'next/server';
import { generateRedeemCode } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const result = await generateRedeemCode({ sessionId });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
