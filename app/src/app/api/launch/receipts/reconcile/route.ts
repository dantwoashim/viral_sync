import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireMerchantRequestRole, withSecurityHeaders } from '@/lib/launch/api';
import { getReceiptReconciliation } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const merchantAuth = await requireMerchantRequestRole(request, ['manager', 'auditor']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  return withSecurityHeaders(NextResponse.json({ ok: true, receipts: await getReceiptReconciliation() }));
}
