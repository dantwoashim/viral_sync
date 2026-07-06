import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl, withPublicReadHeaders } from '@/lib/http/cors';
import { getProofState, gauntletLabel } from '@/lib/proof/getProofState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifierFlags(proof: ReturnType<typeof getProofState>) {
  return {
    terminalVerified: proof.verifier.terminalVerified === true,
    visitorVerified: proof.verifier.visitorVerified === true,
    lineageVerified: proof.verifier.lineageVerified === true,
    settlementVerified: proof.verifier.settlementVerified === true,
    nullifierVerified: proof.verifier.nullifierVerified === true,
  };
}

function gauntletStrict(proof: ReturnType<typeof getProofState>) {
  const blocked = proof.gauntlet.summary?.blocked;
  const total = proof.gauntlet.summary?.totalCases;
  return typeof blocked === 'number' &&
    typeof total === 'number' &&
    total >= 16 &&
    blocked === total &&
    proof.gauntlet.summary?.missing === 0 &&
    proof.gauntlet.summary?.failed === 0;
}

export async function OPTIONS() {
  return withPublicReadHeaders(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proof = getProofState();
  const receiptLookup = decodeURIComponent(id);
  const receiptPda = String(proof.manifest.pdas?.causalReceipt ?? '');
  const matchesReceipt = receiptLookup === 'latest' || receiptLookup === proof.receiptId || receiptLookup === receiptPda;

  if (!matchesReceipt) {
    return withPublicReadHeaders(NextResponse.json({
      ok: false,
      artifactType: 'viral_sync_agent_receipt_context',
      error: 'receipt_not_found',
      message: 'The requested receipt does not match the submitted POC-1 receipt ID or receipt PDA.',
    }, { status: 404 }));
  }

  const root = appBaseUrl(request);
  const flags = verifierFlags(proof);
  const sourceHashesMatched = proof.readiness.status === 'GO' && proof.readiness.hashesVerified === true;
  const fraudGauntletBlockedAllCases = gauntletStrict(proof);
  const verified = proof.health === 'verified' &&
    Object.values(flags).every(Boolean) &&
    fraudGauntletBlockedAllCases &&
    sourceHashesMatched;

  return withPublicReadHeaders(NextResponse.json({
    ok: verified,
    artifactType: 'viral_sync_agent_receipt_context',
    generatedFor: receiptLookup,
    receipt: {
      id: proof.receiptId,
      pda: receiptPda,
      merchantName: proof.merchantName,
      cluster: proof.cluster,
      programId: proof.programId,
      status: proof.statusLabel,
      proofLevel: proof.proofLevel,
      attestationModel: proof.attestationModel,
      reward: proof.rewardAmountLabel,
      explorer: proof.manifest.explorerLinks,
    },
    trustPolicy: {
      decision: verified ? 'trust_payout' : 'review_required',
      verifiedReceiptRequires: [
        'terminalVerified',
        'visitorVerified',
        'lineageVerified',
        'settlementVerified',
        'nullifierVerified',
        'fraudGauntletBlockedAllCases',
        'sourceHashesMatched',
      ],
      checks: {
        ...flags,
        fraudGauntletBlockedAllCases,
        sourceHashesMatched,
      },
    },
    verifier: {
      ok: proof.verifier.ok === true,
      flags,
      terminalChecks: proof.verifier.terminalChecks ?? {},
      lineageChecks: proof.verifier.lineageChecks ?? {},
      settlementChecks: proof.verifier.settlementChecks ?? {},
      nullifierChecks: proof.verifier.nullifierChecks ?? {},
      tokenAccountChecks: proof.verifier.tokenAccountChecks ?? {},
      settlementRecord: proof.verifier.settlementRecord,
      tokenBalances: proof.verifier.tokenBalances,
    },
    lineage: {
      childLineageProof: proof.manifest.childLineageProof ?? null,
      onChainParentReceiptVerified: proof.manifest.childLineageProof?.onChainParentReceiptVerified === true,
    },
    fraudGauntlet: {
      label: gauntletLabel(proof.gauntlet),
      summary: proof.gauntlet.summary ?? null,
      cases: proof.gauntlet.cases?.map((item) => ({
        id: item.id,
        expectedErrorCode: item.expectedErrorCode,
        observed: item.observed,
        expectedErrorMatched: item.expectedErrorMatched === true,
        accountsMutationVerified: item.accountsMutationVerified === true,
        failureKind: item.failureKind,
        proofSource: item.proofSource,
      })) ?? [],
    },
    artifacts: {
      receiptManifest: `${root}/proofs/devnet-causal-commerce.json`,
      verifier: `${root}/proofs/devnet-causal-commerce-verifier.json`,
      fraudGauntlet: `${root}/proofs/fraud-gauntlet.json`,
      frontierReadiness: `${root}/proofs/frontier-readiness.json`,
      proofFeed: `${root}/proofs/proof-feed.json`,
      publicReceipt: `${root}/receipt/${encodeURIComponent(proof.receiptId)}`,
      proofCenter: `${root}/proof`,
    },
    x402: {
      mcp: `${root}/.well-known/mcp.json`,
      paidTools: [
        {
          name: 'x402_create_campaign',
          service: 'viral-sync-relayer',
          endpoint: 'POST /campaigns/create',
          payment: { protocol: 'x402', amount: '0.10', asset: 'USDC', network: 'solana-devnet' },
        },
        {
          name: 'x402_verify_receipt',
          service: 'viral-sync-relayer',
          endpoint: 'GET /receipts/{receiptPda}/verify',
          payment: { protocol: 'x402', amount: '0.001', asset: 'USDC', network: 'solana-devnet' },
        },
      ],
    },
  }));
}
