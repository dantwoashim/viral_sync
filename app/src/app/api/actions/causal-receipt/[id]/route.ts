import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl, withCorsHeaders } from '@/lib/http/cors';
import { getProofState } from '@/lib/proof/getProofState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS_CORS = {
  methods: 'GET,POST,OPTIONS',
  headers: 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  extraHeaders: {
  'X-Action-Version': '2.4',
  },
};

function actionHeaders(response: NextResponse, request: NextRequest, options: { publicRead?: boolean } = {}) {
  return withCorsHeaders(response, request, { ...ACTIONS_CORS, publicRead: options.publicRead });
}

export async function OPTIONS(request: NextRequest) {
  return actionHeaders(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  const receiptLookup = decodeURIComponent(id);
  const matchesReceipt = receiptLookup === 'latest' || receiptLookup === proof.receiptId || receiptLookup === proof.manifest.pdas?.causalReceipt;
  if (!matchesReceipt) {
    return actionHeaders(NextResponse.json({ error: 'Receipt proof not found.' }, { status: 404 }), request, { publicRead: true });
  }

  const root = appBaseUrl(request);
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
  }), request, { publicRead: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  const receiptLookup = decodeURIComponent(id);
  const matchesReceipt = receiptLookup === 'latest' || receiptLookup === proof.receiptId || receiptLookup === proof.manifest.pdas?.causalReceipt;
  if (!matchesReceipt) {
    return actionHeaders(NextResponse.json({ ok: false, error: 'Receipt proof not found.' }, { status: 404 }), request);
  }

  const body = await request.json().catch(() => null) as { account?: string } | null;
  if (!body?.account) {
    return actionHeaders(NextResponse.json({ ok: false, error: 'Wallet account is required.' }, { status: 400 }), request);
  }

  const verificationIntent = createHash('sha256')
    .update(JSON.stringify({ receipt: proof.manifest.pdas?.causalReceipt, account: body.account, programId: proof.programId }))
    .digest('hex');

  return actionHeaders(NextResponse.json({
    ok: true,
    artifactType: 'poc1_receipt_verification_preview',
    verificationPreview: verificationIntent,
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
  }), request);
}
