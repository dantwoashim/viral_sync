import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, requireMerchantRequestRole, withSecurityHeaders } from '@/lib/launch/api';
import { searchSupportIndex } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, 'support-search', 60);
  if (limited) {
    return limited;
  }
  const merchantAuth = await requireMerchantRequestRole(request, ['support']);
  if (!merchantAuth.ok) {
    return merchantAuth.response;
  }

  const query = request.nextUrl.searchParams.get('q') ?? '';
  const results = await searchSupportIndex(query);

  return withSecurityHeaders(NextResponse.json({ ok: true, query, results }));
}
