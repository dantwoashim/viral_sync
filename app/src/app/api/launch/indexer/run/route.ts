import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requestId, withSecurityHeaders } from '@/lib/launch/api';
import { runProgramEventIndexer } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const expected = process.env.LAUNCH_INDEXER_API_KEY || 'DEMO-INDEXER-KEY';
  if (request.headers.get('x-viral-sync-indexer-key') !== expected) {
    return jsonError('Indexer service auth failed.', 401, 'unauthorized', requestId(request));
  }

  return withSecurityHeaders(NextResponse.json(await runProgramEventIndexer()));
}
