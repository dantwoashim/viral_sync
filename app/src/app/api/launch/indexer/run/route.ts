import { NextRequest, NextResponse } from 'next/server';
import { jsonError, requestId, requireLaunchOpen, withSecurityHeaders } from '@/lib/launch/api';
import { runProgramEventIndexer } from '@/lib/launch/server';
import { getIndexerApiKey } from '@/lib/launch/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const paused = requireLaunchOpen(request);
  if (paused) {
    return paused;
  }
  const expected = getIndexerApiKey();
  if (request.headers.get('x-viral-sync-indexer-key') !== expected) {
    return jsonError('Indexer service auth failed.', 401, 'unauthorized', requestId(request));
  }

  return withSecurityHeaders(NextResponse.json(await runProgramEventIndexer()));
}
