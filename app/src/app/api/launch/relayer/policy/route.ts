import { NextResponse } from 'next/server';
import { withSecurityHeaders } from '@/lib/launch/api';
import { getRelayerPolicy } from '@/lib/launch/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withSecurityHeaders(NextResponse.json({ ok: true, policy: getRelayerPolicy() }));
}
