import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getProductionReadiness } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = getProductionReadiness();
  return withSecurityHeaders(NextResponse.json({
    ok: true,
    service: 'viral-sync-launch',
    checkedAt: new Date().toISOString(),
    status: readiness.ok ? 'ready' : 'blocked',
    readiness,
  }, { status: readiness.readiness.paused ? 503 : 200 }));
}
