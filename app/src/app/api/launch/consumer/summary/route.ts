import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, jsonError, withSecurityHeaders } from '@/lib/launch/api';
import { getConsumerSummary, isValidSessionId } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, 'consumer-summary', 90);
  if (limited) {
    return limited;
  }

  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId || !isValidSessionId(sessionId)) {
    return jsonError('A valid sessionId is required.', 400);
  }

  const summary = await getConsumerSummary(sessionId);
  return withSecurityHeaders(NextResponse.json(summary));
}
