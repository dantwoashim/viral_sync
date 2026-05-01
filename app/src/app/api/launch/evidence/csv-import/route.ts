import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, readJsonBody, requireLaunchOpen, requireMerchantRequestRole, requireSameOrigin, withSecurityHeaders } from '@/lib/launch/api';
import { importSalesCsv } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'evidence-csv-import', 20);
  if (limited) {
    return limited;
  }
  const paused = requireLaunchOpen(request);
  if (paused) {
    return paused;
  }
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) {
    return invalidOrigin;
  }
  const merchantAuth = await requireMerchantRequestRole(request, ['manager']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  const contentType = request.headers.get('content-type') ?? '';
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(contentLength) && contentLength > 250_000) {
    return withSecurityHeaders(NextResponse.json({
      ok: false,
      error: {
        code: 'csv_too_large',
        message: 'CSV import is capped at 250 KB for the pilot.',
      },
    }, { status: 413 }));
  }
  let csv = '';
  if (contentType.includes('application/json')) {
    const body = await readJsonBody(request) as Record<string, unknown> | null;
    csv = typeof body?.csv === 'string' ? body.csv : '';
  } else {
    csv = await request.text();
  }

  return withSecurityHeaders(NextResponse.json({ ok: true, result: await importSalesCsv(csv) }));
}
