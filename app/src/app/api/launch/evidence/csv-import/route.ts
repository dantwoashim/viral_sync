import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, readJsonBody, withSecurityHeaders } from '@/lib/launch/api';
import { importSalesCsv } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'evidence-csv-import', 20);
  if (limited) {
    return limited;
  }

  const contentType = request.headers.get('content-type') ?? '';
  let csv = '';
  if (contentType.includes('application/json')) {
    const body = await readJsonBody(request) as Record<string, unknown> | null;
    csv = typeof body?.csv === 'string' ? body.csv : '';
  } else {
    csv = await request.text();
  }

  return withSecurityHeaders(NextResponse.json({ ok: true, result: await importSalesCsv(csv) }));
}
