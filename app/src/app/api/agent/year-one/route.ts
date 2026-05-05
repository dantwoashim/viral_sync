import { NextRequest, NextResponse } from 'next/server';
import { getProofState } from '@/lib/proof/getProofState';
import { getWorldClassReadiness } from '@/lib/readiness/phases6to10';
import { getYearOneAudit } from '@/lib/readiness/yearOneAudit';
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
  const readiness = getWorldClassReadiness(proof, validation);
  const audit = getYearOneAudit(proof, validation, readiness);
  const root = appBaseUrl(request);

  return agentHeaders(NextResponse.json({
    ok: audit.allCodeExecutableWorkComplete,
    ...audit,
    links: {
      proofCenter: `${root}/proof#year-one`,
      readiness: `${root}/api/agent/readiness`,
      validation: `${root}/api/agent/validation`,
      receiptContext: `${root}/api/agent/receipt/latest`,
      finalProof: `${root}/proofs/devnet-causal-commerce.json`,
    },
  }));
}
