import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireMerchantRequestRole, withSecurityHeaders } from '@/lib/launch/api';
import { exportInvoiceCsv } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const merchantAuth = await requireMerchantRequestRole(request, ['manager']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  return withSecurityHeaders(new NextResponse(await exportInvoiceCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="viral-sync-invoice-export.csv"',
    },
  }));
}
