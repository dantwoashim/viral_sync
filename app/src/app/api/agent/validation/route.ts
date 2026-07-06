import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl, withPublicReadHeaders } from '@/lib/http/cors';
import { getProofState } from '@/lib/proof/getProofState';
import { getMerchantValidationState } from '@/lib/traction/merchantValidation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const proof = getProofState();
  const validation = getMerchantValidationState(proof);
  const root = appBaseUrl(request);

  return withPublicReadHeaders(NextResponse.json({
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
