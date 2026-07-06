import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl, withPublicReadHeaders } from '@/lib/http/cors';
import { getProofState } from '@/lib/proof/getProofState';
import { getWorldClassReadiness } from '@/lib/readiness/operatingReadiness';
import { getMerchantValidationState } from '@/lib/traction/merchantValidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const proof = getProofState();
  const validation = getMerchantValidationState(proof);
  const readiness = getWorldClassReadiness(proof, validation);
  const root = appBaseUrl(request);

  return withPublicReadHeaders(NextResponse.json({
    ok: readiness.finalGate.submitToJudges,
    ...readiness,
    links: {
      proofCenter: `${root}/proof#readiness`,
      validation: `${root}/api/agent/validation`,
      receiptContext: `${root}/api/agent/receipt/latest`,
      merchantValidationKit: `${root}/proofs/merchant-validation-kit.json`,
    },
  }));
}
