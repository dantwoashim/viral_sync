import { NextRequest, NextResponse } from 'next/server';
import { confirmRedeemCode } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const code = typeof body?.code === 'string' ? body.code : '';

  if (!code) {
    return NextResponse.json({ error: 'code is required.' }, { status: 400 });
  }

  const result = await confirmRedeemCode({ code });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
