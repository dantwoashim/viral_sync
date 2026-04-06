import { NextRequest, NextResponse } from 'next/server';
import { getConsumerSummary } from '@/lib/launch/server';
import { badRequest } from '@/lib/launch/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return badRequest('sessionId is required.');
  }

  const summary = await getConsumerSummary(sessionId);
  return NextResponse.json(summary);
}
