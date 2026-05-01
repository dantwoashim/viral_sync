import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireMerchantRequestRole, withSecurityHeaders } from '@/lib/launch/api';
import { getRelayerMonitoring } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const merchantAuth = await requireMerchantRequestRole(request, ['auditor']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  return withSecurityHeaders(NextResponse.json({ ok: true, monitoring: await getRelayerMonitoring() }));
}
