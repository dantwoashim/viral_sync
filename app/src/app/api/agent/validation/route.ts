import { NextRequest, NextResponse } from 'next/server';
import { getProofState } from '@/lib/proof/getProofState';
import { getMerchantValidationState } from '@/lib/traction/merchantValidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AGENT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept-Encoding',
};

function agentHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(AGENT_HEADERS)) response.headers.set(key, value);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

function appBaseUrl(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return new URL(request.url).origin || 'http://localhost:3000';
}

export async function OPTIONS() {
  return agentHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const proof = getProofState();
  const validation = getMerchantValidationState(proof);
  const root = appBaseUrl(request);

  return agentHeaders(NextResponse.json({
    ok: validation.technicalProofVerified,
    ...validation,
    decision: validation.tractionClaimAllowed ? 'merchant_traction_claim_allowed' : 'technical_proof_only_do_not_claim_live_traction',
    links: {
      proofCenter: `${root}/proof#validation`,
      merchantValidationKit: `${root}/proofs/merchant-validation-kit.json`,
      receiptContext: `${root}/api/agent/receipt/latest`,
      receipt: `${root}/receipt/latest`,
    },
  }));
}
