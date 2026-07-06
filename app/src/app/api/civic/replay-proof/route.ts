import { NextResponse } from 'next/server';
import { withPublicReadHeaders } from '@/lib/http/cors';
import { buildReplayRejectionProof } from '@/lib/civic/participationPass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return withPublicReadHeaders(NextResponse.json(data, { status }), 'GET,POST,OPTIONS', 'Content-Type');
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }), 'GET,POST,OPTIONS', 'Content-Type');
}

export async function GET(request: Request) {
  const passToken = new URL(request.url).searchParams.get('pass');
  if (!passToken) return json({ ok: false, status: 'rejected', reason: 'pass_token_required' }, 400);
  const proof = buildReplayRejectionProof(passToken);
  return json(proof, proof.ok ? 200 : 400);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { passToken?: string } | null;
  if (!body?.passToken) return json({ ok: false, status: 'rejected', reason: 'pass_token_required' }, 400);
  const proof = buildReplayRejectionProof(body.passToken);
  return json(proof, proof.ok ? 200 : 400);
}
