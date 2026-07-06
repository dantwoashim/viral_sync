import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { verifyCivicParticipationPass } from '@/lib/civic/participationPass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'POST,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'POST,OPTIONS', 'Content-Type');
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { passToken?: string; marketSlug?: string } | null;
  if (!body?.passToken) return json({ ok: false, status: 'rejected', reason: 'pass_token_required' }, 400);
  const verification = verifyCivicParticipationPass(body.passToken, body.marketSlug);
  return json(verification, verification.ok ? 200 : 400);
}
