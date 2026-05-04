import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getProofState } from '@/lib/proof/getProofState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'X-Action-Version': '2.4',
};

function actionHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(ACTIONS_HEADERS)) {
    response.headers.set(key, value);
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function baseUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host') ?? 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

export async function OPTIONS() {
  return actionHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  const receiptLookup = decodeURIComponent(id);
  const matchesReceipt = receiptLookup === proof.receiptId || receiptLookup === proof.manifest.pdas?.causalReceipt;
  if (!matchesReceipt) {
    return actionHeaders(NextResponse.json({ error: 'Receipt proof not found.' }, { status: 404 }));
  }

  const root = baseUrl(request);
  return actionHeaders(NextResponse.json({
    icon: `${root}/icon.png`,
    title: `Verify receipt: ${proof.merchantName}`,
    description: `POC-1 receipt verification: ${proof.statusLabel}.`,
    links: {
      actions: [
        { label: 'Open receipt proof', href: `${root}/receipt/${encodeURIComponent(proof.receiptId)}` },
      ],
    },
    viralSync: {
      type: 'poc1_receipt_verification',
      proofStatus: proof.statusLabel,
      proofLevel: proof.proofLevel,
      cluster: proof.cluster,
      programId: proof.programId,
      receiptPda: proof.manifest.pdas?.causalReceipt,
    },
  }));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  const receiptLookup = decodeURIComponent(id);
  const matchesReceipt = receiptLookup === proof.receiptId || receiptLookup === proof.manifest.pdas?.causalReceipt;
  if (!matchesReceipt) {
    return actionHeaders(NextResponse.json({ ok: false, error: 'Receipt proof not found.' }, { status: 404 }));
  }

  const body = await request.json().catch(() => null) as { account?: string } | null;
  if (!body?.account) {
    return actionHeaders(NextResponse.json({ ok: false, error: 'Wallet account is required.' }, { status: 400 }));
  }

  const verificationIntent = createHash('sha256')
    .update(JSON.stringify({ receipt: proof.manifest.pdas?.causalReceipt, account: body.account, programId: proof.programId }))
    .digest('hex');

  return actionHeaders(NextResponse.json({
    ok: true,
    artifactType: 'poc1_receipt_verification_intent',
    verificationIntent,
    receiptPda: proof.manifest.pdas?.causalReceipt,
    account: body.account,
    proofStatus: proof.statusLabel,
    verifier: {
      terminalVerified: proof.verifier.terminalVerified === true,
      visitorVerified: proof.verifier.visitorVerified === true,
      lineageVerified: proof.verifier.lineageVerified === true,
      settlementVerified: proof.verifier.settlementVerified === true,
      nullifierVerified: proof.verifier.nullifierVerified === true,
    },
  }));
}
