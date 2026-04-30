import { NextResponse } from 'next/server';
import { exportInvoiceCsv } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse(await exportInvoiceCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="viral-sync-invoice-export.csv"',
    },
  });
}
