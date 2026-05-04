import fs from 'fs';
import { expect } from 'chai';
import { canonicalArtifactHash, readJson, computeProofHashes } from '../scripts/proof-artifact-utils';
import { expectedErrorMatched, expectedPatternsFor } from '../scripts/fraud-error-matching';
import { isPublicDemoRoute } from '../app/src/lib/demo-mode';
import { gauntletLabel } from '../app/src/lib/proof/getProofState';
import { confirmVisitPass, createVisitPassPacket } from '../app/src/lib/product-loop/productLoop';
import { getMerchantValidationState, normalizeMerchantValidation } from '../app/src/lib/traction/merchantValidation';

describe('proof hardening regressions', () => {
  it('binds the published manifest to current source, IDL, generator, and verifier', () => {
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const current = computeProofHashes();

    expect(manifest.programSourceHash).to.equal(current.programSourceHash);
    expect(manifest.idlHash).to.equal(current.idlHash);
    expect(manifest.proofGeneratorHash).to.equal(current.proofGeneratorHash);
    expect(manifest.verifierHash).to.equal(current.verifierHash);
  });

  it('does not let generic custom program errors satisfy specific expected errors', () => {
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
    expect(expectedErrorMatched('Error Code: InvalidClaimPass', expectedPatternsFor('InvalidClaimPass'))).to.equal(true);
    expect(expectedErrorMatched('custom program error: 0x178f', expectedPatternsFor('InvalidVisitorAuthority'))).to.equal(false);
  });

  it('keeps public proof artifacts and well-known metadata reachable while hiding old surfaces', () => {
    expect(isPublicDemoRoute('/proofs/fraud-gauntlet.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/devnet-causal-commerce-verifier.json')).to.equal(true);
    expect(isPublicDemoRoute('/proofs/proof-feed.json')).to.equal(true);
    expect(isPublicDemoRoute('/.well-known/blink.json')).to.equal(true);
    expect(isPublicDemoRoute('/icon.png')).to.equal(true);
    expect(isPublicDemoRoute('/admin')).to.equal(false);
    expect(isPublicDemoRoute('/frontier')).to.equal(false);
  });

  it('does not default missing gauntlet data to a false 16/16 success label', () => {
    expect(gauntletLabel({})).to.equal('Pending');
  });

  it('keeps canonical artifact hashes self-consistent after stamping', () => {
    for (const file of [
      'app/public/proofs/devnet-causal-commerce.json',
      'app/public/proofs/devnet-causal-commerce-verifier.json',
      'app/public/proofs/fraud-gauntlet.json',
      'app/public/proofs/proof-feed.json',
    ]) {
      const artifact = readJson<Record<string, unknown>>(file);
      expect(artifact.artifactHash, file).to.equal(canonicalArtifactHash(artifact));
    }
  });

  it('uses canonical verifier hashes that are not self-referential raw file hashes', () => {
    const current = computeProofHashes();
    const manifest = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce.json');
    const published = readJson<Record<string, unknown>>('app/public/proofs/devnet-causal-commerce-verifier.json');

    expect(manifest.publishedVerifierHash).to.equal(current.publishedVerifierHash);
    expect(published.publishedVerifierHash).to.equal(current.publishedVerifierHash);
  });

  it('wires the customer and terminal surfaces to product-loop APIs instead of static timers', () => {
    const claim = fs.readFileSync('app/src/app/claim/[token]/page.tsx', 'utf8');
    const claimClient = fs.readFileSync('app/src/components/product/ProductClaimFlow.tsx', 'utf8');
    const terminal = fs.readFileSync('app/src/components/product/MerchantTerminalFlow.tsx', 'utf8');

    expect(claim).to.include('ProductClaimFlow');
    expect(claimClient).to.include('/api/product-loop/claim-pass');
    expect(terminal).to.include('/api/product-loop/terminal/confirm');
    expect(terminal).not.to.include('setTimeout');
    expect(terminal).not.to.include('NEXT_PUBLIC_TERMINAL_DEMO');
  });

  it('creates a proof-backed pass packet and rejects mismatched terminal codes', () => {
    const slug = 'thamel-brew-counter-attested-visits';
    const pass = createVisitPassPacket(slug, slug);
    expect(pass?.ok).to.equal(true);
    expect(pass?.passCode).to.match(/^VS-[0-9A-F]{4}-[0-9A-F]{4}$/);

    const accepted = confirmVisitPass({ slug, token: slug, passCode: pass?.passCode });
    expect(accepted.ok).to.equal(true);
    expect(accepted.status).to.equal('verified');
    expect(accepted.checks.every((check) => check.ok)).to.equal(true);

    const rejected = confirmVisitPass({ slug, token: slug, passCode: 'VS-USED-PASS' });
    expect(rejected.ok).to.equal(false);
    expect(rejected.status).to.equal('rejected');
  });

  it('keeps phase 2 and phase 3 protocol hardening wired into the on-chain surface', () => {
    const program = fs.readFileSync('programs/viral_sync/src/instructions/causal_commerce.rs', 'utf8');
    const lib = fs.readFileSync('programs/viral_sync/src/lib.rs', 'utf8');
    const errors = fs.readFileSync('programs/viral_sync/src/errors.rs', 'utf8');
    const runner = fs.readFileSync('scripts/run-causal-commerce-localnet.ts', 'utf8');
    const verifier = fs.readFileSync('scripts/verify-causal-receipt-localnet.ts', 'utf8');

    expect(program).to.include('set_terminal_device_status');
    expect(lib).to.include('pub fn set_terminal_device_status');
    expect(program).to.include('InvalidLineageProof');
    expect(program).to.include('claim_pass.depth == 1');
    expect(program).to.include('parent_receipt_id_hash == [0; 32]');
    expect(program).to.include('claim_pass.referrer_receipt != Pubkey::default()');
    expect(program).to.include('remaining_accounts');
    expect(program).to.include('parent_receipt.status == CausalReceiptStatus::Settled');
    expect(program).to.include('parent_receipt.receipt_id_hash == parent_receipt_id_hash');
    expect(runner).to.include('child-parent-receipt-hash-mismatch');
    expect(verifier).to.include('childParentReceiptVerified');
    expect(errors).to.include('InvalidLineageProof');
  });

  it('publishes phase 4 agent and x402 discovery surfaces without overstating payment-free access', () => {
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
      proofContract?: { currentFraudGauntlet?: string };
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
      x402?: { relayer?: Record<string, string> };
    };
    const agentRoute = fs.readFileSync('app/src/app/api/agent/receipt/[id]/route.ts', 'utf8');
    const relayer = fs.readFileSync('relayer/src/index.ts', 'utf8');

    const toolByName = new Map(mcp.tools.map((tool) => [tool.name, tool]));
    expect(toolByName.get('agent_receipt_context')?.endpoint).to.equal('GET /api/agent/receipt/{id}');
    expect(toolByName.get('x402_create_campaign')?.payment).to.deep.include({ protocol: 'x402', amount: '0.10', asset: 'USDC' });
    expect(toolByName.get('x402_verify_receipt')?.payment).to.deep.include({ protocol: 'x402', amount: '0.001', asset: 'USDC' });
    expect(mcp.proofContract?.currentFraudGauntlet).to.equal('19/19');

    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/receipt/*')).to.equal(true);
    expect(blink.x402?.relayer?.verifyReceipt).to.equal('GET /receipts/{receiptPda}/verify');

    expect(agentRoute).to.include('viral_sync_agent_receipt_context');
    expect(agentRoute).to.include('childLineageProof');
    expect(agentRoute).to.include('fraudGauntletBlockedAllCases');
    expect(agentRoute).to.include('sourceHashesMatched');
    expect(agentRoute).to.include('x402_verify_receipt');

    expect(relayer).to.include("app.get('/.well-known/mcp.json'");
    expect(relayer).to.include('X402_CREATE_CAMPAIGN_PRICE');
    expect(relayer).to.include('X402_VERIFY_RECEIPT_PRICE');
    expect(relayer).to.include('relay_sponsored_transaction');
  });

  it('keeps phase 5 merchant validation honest until required evidence is verified', () => {
    const validation = getMerchantValidationState();
    const proofPage = fs.readFileSync('app/src/app/proof/page.tsx', 'utf8');
    const validationRoute = fs.readFileSync('app/src/app/api/agent/validation/route.ts', 'utf8');
    const mcp = JSON.parse(fs.readFileSync('app/public/.well-known/mcp.json', 'utf8')) as {
      tools: Array<{ name: string; endpoint?: string; payment?: string | Record<string, unknown> }>;
    };
    const blink = JSON.parse(fs.readFileSync('app/public/.well-known/blink.json', 'utf8')) as {
      rules?: Array<{ pathPattern?: string }>;
    };

    expect(validation.artifactType).to.equal('viral_sync_merchant_validation_context');
    expect(validation.technicalProofVerified).to.equal(false);
    expect(validation.tractionClaimAllowed).to.equal(false);
    expect(validation.claimStatus).to.equal('not_claimed');
    expect(validation.evidenceSummary.requiredSlots).to.be.greaterThan(0);
    expect(validation.evidenceSummary.requiredVerifiedSlots).to.equal(0);
    expect(validation.safeSubmissionWording).to.match(/not claimed/i);

    const claimable = normalizeMerchantValidation({
      merchantAlias: 'Proof Cafe',
      evidenceSlots: [
        { id: 'quote', status: 'verified', requiredForClaimingTraction: true },
        { id: 'video', status: 'verified', requiredForClaimingTraction: true },
      ],
    });
    expect(claimable.tractionClaimAllowed).to.equal(true);
    expect(claimable.claimStatus).to.equal('claimable');

    expect(proofPage).to.include('id="validation"');
    expect(proofPage).to.include('Traction not claimed');
    expect(validationRoute).to.include('technical_proof_only_do_not_claim_live_traction');
    expect(mcp.tools.some((tool) => tool.name === 'merchant_validation_context' && tool.endpoint === 'GET /api/agent/validation')).to.equal(true);
    expect(blink.rules?.some((rule) => rule.pathPattern === '/api/agent/validation')).to.equal(true);
  });
});
