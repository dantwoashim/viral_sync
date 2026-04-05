import { NextRequest, NextResponse } from 'next/server';
import { getConsumerSummary } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  const summary = await getConsumerSummary(sessionId);
  return NextResponse.json(summary);
}
